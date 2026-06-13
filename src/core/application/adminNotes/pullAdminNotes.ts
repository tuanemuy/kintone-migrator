import type { AdminNotesConfig } from "@/core/domain/adminNotes/entity";
import {
  type AdminNotesMergeResolution,
  type AdminNotesThreeWayMerge,
  computeAdminNotesThreeWayMerge,
  resolveAdminNotesMerge,
} from "@/core/domain/adminNotes/services/adminNotesMerge";
import { AdminNotesConfigSerializer } from "@/core/domain/adminNotes/services/configSerializer";
import type { AdminNotesServiceArgs } from "../container/adminNotes";
import { wrapBusinessRuleError } from "../error";
import { stringifyConfig } from "../stringifyConfig";
import { saveAdminNotesSnapshotAndRevision } from "./adminNotesStateIo";
import { loadAdminNotesThreeWayInputs } from "./loadAdminNotesThreeWayInputs";

export type PullAdminNotesInput = {
  /** Overwrite local with remote (capture-equivalent), bypassing merge. */
  readonly force?: boolean;
};

export type PullAdminNotesOutput =
  | { readonly mode: "force"; readonly configText: string }
  | { readonly mode: "firstTime"; readonly configText: string }
  | {
      readonly mode: "merged";
      readonly merge: AdminNotesThreeWayMerge;
      readonly remoteConfig: AdminNotesConfig;
      readonly remoteRevision: string;
    };

function serializeAdminNotes(
  container: AdminNotesServiceArgs["container"],
  config: AdminNotesConfig,
): string {
  return stringifyConfig(
    container.configCodec,
    AdminNotesConfigSerializer.serialize(config),
  );
}

/**
 * First stage of `admin-notes pull`. Same shape as the other
 * single-config pulls: force / first run overwrite local from remote; otherwise
 * compute the whole-entity merge and return it for CLI conflict resolution
 * without touching local/state (side-effect free when aborted).
 */
export async function pullAdminNotes({
  container,
  input,
}: AdminNotesServiceArgs<PullAdminNotesInput>): Promise<PullAdminNotesOutput> {
  const { state, local, remote } =
    await loadAdminNotesThreeWayInputs(container);

  if (input.force || state === undefined || local === undefined) {
    const configText = serializeAdminNotes(container, remote.config);
    await container.adminNotesStorage.update(configText);
    await saveAdminNotesSnapshotAndRevision(
      container,
      remote.config,
      remote.revision,
    );
    return {
      mode: input.force ? "force" : "firstTime",
      configText,
    };
  }

  const merge = computeAdminNotesThreeWayMerge(state, local, remote.config);

  return {
    mode: "merged",
    merge,
    remoteConfig: remote.config,
    remoteRevision: remote.revision,
  };
}

export type ApplyPulledAdminNotesMergeInput = {
  readonly merge: AdminNotesThreeWayMerge;
  readonly resolution: AdminNotesMergeResolution;
  readonly remoteConfig: AdminNotesConfig;
  readonly remoteRevision: string;
};

/**
 * Second stage of `admin-notes pull`: applies a resolved whole-entity merge,
 * writing the merged config to local YAML and advancing the base to the remote
 * snapshot/revision. Never invoked when the user aborts resolution.
 */
export async function applyPulledAdminNotesMerge({
  container,
  input,
}: AdminNotesServiceArgs<ApplyPulledAdminNotesMergeInput>): Promise<{
  readonly configText: string;
}> {
  const merged = wrapBusinessRuleError(() =>
    resolveAdminNotesMerge(input.merge, input.resolution),
  );
  const configText = serializeAdminNotes(container, merged);
  await container.adminNotesStorage.update(configText);
  await saveAdminNotesSnapshotAndRevision(
    container,
    input.remoteConfig,
    input.remoteRevision,
  );
  return { configText };
}
