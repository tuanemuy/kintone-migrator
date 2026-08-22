import type { AppRevisionStorage } from "@/core/domain/appRevision/ports/appRevisionStorage";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { loadAppRevision } from "../appRevisionIo";
import { loadSnapshotState, type SnapshotStateStorage } from "./stateIo";

/**
 * The four inputs of a domain-agnostic 3-way sync:
 *
 * - `state`: the base snapshot (common ancestor), or undefined on first run.
 * - `baseRevision`: the app (preview) revision saved alongside the base
 *   snapshot, or undefined on first run. The revision is app-scoped, so it is
 *   read from {@link AppRevisionStorage} rather than from the snapshot.
 * - `local`: the local config parsed from its YAML file, or undefined when the
 *   file is absent. Defaults to the snapshot shape; domains whose snapshot
 *   carries more than the config (e.g. customization's file digests) set
 *   `TLocal` to the config type alone.
 * - `remote`: the current remote config (and the remote revision it carries).
 */
export type ThreeWayInputs<TSnapshot, TRemote, TLocal = TSnapshot> = Readonly<{
  state: TSnapshot | undefined;
  baseRevision: string | undefined;
  local: TLocal | undefined;
  remote: TRemote;
}>;

export type LoadThreeWayInputsArgs<
  TSnapshot,
  TRemote,
  TLocal = TSnapshot,
> = Readonly<{
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
  loadLocal: () => Promise<TLocal | undefined>;
  /** Fetches the current remote config (carrying its own revision). */
  loadRemote: () => Promise<TRemote>;
}>;

/**
 * Loads the base snapshot, the base app revision, the local config, and the
 * remote config in parallel for a 3-way sync. Generic over the snapshot
 * (`TSnapshot`) and remote (`TRemote`) shapes so every config domain reuses one
 * loader.
 */
export async function loadThreeWayInputs<
  TSnapshot,
  TRemote,
  TLocal = TSnapshot,
>(
  args: LoadThreeWayInputsArgs<TSnapshot, TRemote, TLocal>,
): Promise<ThreeWayInputs<TSnapshot, TRemote, TLocal>> {
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
