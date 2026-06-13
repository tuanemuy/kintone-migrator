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
 */
export function buildDriftConflict(pullCommand: string): ConflictError {
  return new ConflictError(
    ConflictErrorCode.ConfigDrift,
    buildDriftMessage(pullCommand),
  );
}
