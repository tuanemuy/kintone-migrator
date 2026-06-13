import type { AppPermissionState } from "../state";
import { AppPermissionConfigParser } from "./configParser";

/**
 * Parses pre-parsed (codec-decoded) data into an {@link AppPermissionState}.
 *
 * The inverse of {@link AppPermissionStateSerializer}: the captured config is
 * parsed via the same {@link AppPermissionConfigParser} as the local YAML, so
 * the base snapshot is validated identically. The domain layer does not depend
 * on YAML; the application layer handles codec decoding before calling this.
 */
export const AppPermissionStateParser = {
  parse: (parsed: unknown): AppPermissionState => ({
    config: AppPermissionConfigParser.parse(parsed),
  }),
};
