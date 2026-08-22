import { ConflictError, ConflictErrorCode } from "../error";

/**
 * Builds the standard "remote drifted, pull first" message for a domain.
 *
 * The pull command name is parameterized so each domain surfaces its own
 * guidance (e.g. `view pull`, `schema pull`) while sharing one wording.
 */
export function buildDriftMessage(pullCommand: string): string {
  return `The remote has changed since the base snapshot. Run \`${pullCommand}\` first.`;
}

/**
 * Builds the drift {@link ConflictError} (tagged with {@link
 * ConflictErrorCode.ConfigDrift}) thrown when a push detects base→remote drift
 * and `--force` was not set.
 *
 * The CLI distinguishes this snapshot drift from API optimistic-lock (TOCTOU)
 * conflicts by the `ConfigDrift` code, not by the message string, so the
 * message stays a free-form, domain-specific hint.
 *
 * `extraHint` appends a domain-specific caveat (e.g. customization's "this
 * drift may be inferred") on its own line; omitted, the message is unchanged.
 */
export function buildDriftConflict(
  pullCommand: string,
  extraHint?: string,
): ConflictError {
  const message = buildDriftMessage(pullCommand);
  return new ConflictError(
    ConflictErrorCode.ConfigDrift,
    extraHint === undefined ? message : `${message}\n${extraHint}`,
  );
}
