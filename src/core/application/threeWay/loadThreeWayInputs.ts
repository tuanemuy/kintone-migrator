import type { AppRevisionStorage } from "@/core/domain/appRevision/ports/appRevisionStorage";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { loadAppRevision } from "../appRevisionIo";
import { loadSnapshotState, type SnapshotStateStorage } from "./stateIo";

/**
 * The four inputs of a domain-agnostic 3-way sync (ADR-188 ステップ3):
 *
 * - `state`: the base snapshot (common ancestor), or undefined on first run.
 * - `baseRevision`: the app (preview) revision saved alongside the base
 *   snapshot, or undefined on first run. revision is now app-scoped and read
 *   from {@link AppRevisionStorage} rather than from the snapshot (ADR-188-001).
 * - `local`: the local config parsed from its YAML file, or undefined when the
 *   file is absent.
 * - `remote`: the current remote config (and the remote revision it carries).
 */
export type ThreeWayInputs<TSnapshot, TRemote> = Readonly<{
  state: TSnapshot | undefined;
  baseRevision: string | undefined;
  local: TSnapshot | undefined;
  remote: TRemote;
}>;

export type LoadThreeWayInputsArgs<TSnapshot, TRemote> = Readonly<{
  codec: ConfigCodec;
  /** Snapshot (base) state storage for this domain. */
  stateStorage: SnapshotStateStorage;
  /** App-scoped base revision storage (shared across domains). */
  appRevisionStorage: AppRevisionStorage;
  /** Parses a pre-parsed snapshot state (domain parser). */
  parseState: (parsed: unknown) => TSnapshot;
  /** Label used in parse error messages (e.g. "View state"). */
  stateLabel: string;
  /** Loads the local config from its file, or undefined when absent. */
  loadLocal: () => Promise<TSnapshot | undefined>;
  /** Fetches the current remote config (carrying its own revision). */
  loadRemote: () => Promise<TRemote>;
}>;

/**
 * Loads the base snapshot, the base app revision, the local config, and the
 * remote config in parallel for a 3-way sync. Generic over the snapshot
 * (`TSnapshot`) and remote (`TRemote`) shapes so every config domain reuses one
 * loader (generalization of schema step1's `loadThreeWayInputs`).
 */
export async function loadThreeWayInputs<TSnapshot, TRemote>(
  args: LoadThreeWayInputsArgs<TSnapshot, TRemote>,
): Promise<ThreeWayInputs<TSnapshot, TRemote>> {
  const [state, appRevision, local, remote] = await Promise.all([
    loadSnapshotState(
      args.stateStorage,
      args.codec,
      args.parseState,
      args.stateLabel,
    ),
    loadAppRevision(args.appRevisionStorage, args.codec),
    args.loadLocal(),
    args.loadRemote(),
  ]);

  return {
    state,
    baseRevision: appRevision?.revision,
    local,
    remote,
  };
}
