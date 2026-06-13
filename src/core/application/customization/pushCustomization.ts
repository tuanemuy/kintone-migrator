import { basename, resolve } from "node:path";
import type { CustomizationConfig } from "@/core/domain/customization/entity";
import type { FileUploader } from "@/core/domain/customization/ports/fileUploader";
import { computeCustomizationThreeWayMerge } from "@/core/domain/customization/services/customizationMerge";
import { ResourceMerger } from "@/core/domain/customization/services/resourceMerger";
import type {
  CustomizationPlatform,
  CustomizationResource,
  ResolvedPlatform,
  ResolvedResource,
} from "@/core/domain/customization/valueObject";
import type { CustomizationThreeWayServiceArgs } from "../container/customization";
import { ValidationError, ValidationErrorCode } from "../error";
import { buildDriftConflict } from "../threeWay/driftConflict";
import { computeModifiedFileNames } from "./customizationRemote";
import { saveCustomizationSnapshotAndRevision } from "./customizationStateIo";
import { loadCustomizationThreeWayInputs } from "./loadCustomizationThreeWayInputs";

export type PushCustomizationInput = {
  readonly basePath: string;
  /** Skip drift checking and send no expected revision (revision-skip). */
  readonly force?: boolean;
};

export type PushCustomizationOutput = {
  readonly mode: "push" | "firstTime";
  readonly revision: string;
};

/** Pull command name surfaced in the drift hint message. */
const CUSTOMIZE_PULL_COMMAND = "customize pull";

async function resolvePlatform(
  platform: CustomizationPlatform,
  basePath: string,
  fileUploader: FileUploader,
): Promise<ResolvedPlatform> {
  const resolveList = async (
    resources: readonly CustomizationResource[],
  ): Promise<readonly ResolvedResource[]> =>
    Promise.all(
      resources.map(async (resource): Promise<ResolvedResource> => {
        if (resource.type === "URL") {
          return resource;
        }
        const absolutePath = resolve(basePath, resource.path);
        const { fileKey } = await fileUploader.upload(absolutePath);
        return { type: "FILE", fileKey, name: basename(resource.path) };
      }),
    );

  const [js, css] = await Promise.all([
    resolveList(platform.js),
    resolveList(platform.css),
  ]);
  return { js, css };
}

/**
 * Applies the local customization config to the remote with drift detection
 * (AC-9 / AC-10).
 *
 * - Loads base/local/remote and computes the file-name-keyed 3-way merge. drift
 *   (remoteOnly or conflict entries) && !force → {@link buildDriftConflict}
 *   tagged with `ConfigDrift` (ADR-188-006). Same-name files whose content
 *   diverges count as conflicts and block a non-forced push.
 * - Replaces the full js/css lists with the local config's resolved (uploaded)
 *   resources via `updateAppCustomize`, so renames are expressed as old-name
 *   removal + new-name add (full-list replace — NOT an AC-16 inexpressible
 *   operation, AC-9). The observed remote revision is sent as the expected
 *   revision (TOCTOU guard, ADR-188-004); `--force` / first run omit it.
 *
 * Deploy is performed by the CLI. State records the local config and the
 * post-apply revision as the new base (snapshot → revision).
 */
export async function pushCustomization({
  container,
  input,
}: CustomizationThreeWayServiceArgs<PushCustomizationInput>): Promise<PushCustomizationOutput> {
  const { state, local, remote } =
    await loadCustomizationThreeWayInputs(container);

  if (local === undefined) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Customization config file not found",
    );
  }

  const firstTime = state === undefined;

  if (!firstTime && !input.force) {
    const modifiedFileNames = await computeModifiedFileNames(
      local,
      remote.raw,
      input.basePath,
      container,
    );
    const merge = computeCustomizationThreeWayMerge(
      state,
      local,
      remote.config,
      modifiedFileNames,
    );
    const hasDrift = merge.entries.some(
      (e) => e.change.kind === "remoteOnly" || e.change.kind === "conflict",
    );
    if (hasDrift) {
      throw buildDriftConflict(CUSTOMIZE_PULL_COMMAND);
    }
  }

  const [desktop, mobile] = await Promise.all([
    resolvePlatform(local.desktop, input.basePath, container.fileUploader),
    resolvePlatform(local.mobile, input.basePath, container.fileUploader),
  ]);

  ResourceMerger.assertResourceCount("desktop.js", desktop.js);
  ResourceMerger.assertResourceCount("desktop.css", desktop.css);
  ResourceMerger.assertResourceCount("mobile.js", mobile.js);
  ResourceMerger.assertResourceCount("mobile.css", mobile.css);

  const expectedRevision =
    input.force || firstTime ? undefined : remote.revision;

  const { revision: newRevision } =
    await container.customizationConfigurator.updateCustomization({
      scope: local.scope,
      // Full-list replace (authoritative): the local config is the source of
      // truth, so renames/deletions are expressed by sending the complete lists.
      desktop: { js: desktop.js, css: desktop.css },
      mobile: { js: mobile.js, css: mobile.css },
      ...(expectedRevision !== undefined ? { revision: expectedRevision } : {}),
    });

  const newBase: CustomizationConfig = {
    scope: local.scope,
    desktop: local.desktop,
    mobile: local.mobile,
  };
  await saveCustomizationSnapshotAndRevision(container, newBase, newRevision);

  return {
    mode: firstTime ? "firstTime" : "push",
    revision: newRevision,
  };
}
