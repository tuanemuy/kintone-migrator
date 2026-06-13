import type { AdminNotesState } from "../state";
import { AdminNotesConfigParser } from "./configParser";

/**
 * Parses pre-parsed (codec-decoded) data into an {@link AdminNotesState}.
 *
 * The inverse of {@link AdminNotesStateSerializer}: the captured config is
 * parsed via the same {@link AdminNotesConfigParser} as the local YAML, so the
 * base snapshot is validated identically. The domain layer does not depend on
 * YAML; the application layer handles codec decoding before calling this.
 */
export const AdminNotesStateParser = {
  parse: (parsed: unknown): AdminNotesState => ({
    config: AdminNotesConfigParser.parse(parsed),
  }),
};
