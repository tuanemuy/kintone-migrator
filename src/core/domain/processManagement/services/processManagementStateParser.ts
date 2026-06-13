import type { ProcessManagementState } from "../state";
import { ProcessManagementConfigParser } from "./configParser";

/**
 * Parses pre-parsed (codec-decoded) data into a {@link ProcessManagementState}.
 *
 * The inverse of {@link ProcessManagementStateSerializer}: the captured config is
 * parsed via the same {@link ProcessManagementConfigParser} as the local YAML,
 * so the base snapshot is validated identically. The domain layer does not
 * depend on YAML; the application layer handles codec decoding before this.
 */
export const ProcessManagementStateParser = {
  parse: (parsed: unknown): ProcessManagementState => ({
    config: ProcessManagementConfigParser.parse(parsed),
  }),
};
