import type { FieldPermissionState } from "../state";
import { FieldPermissionConfigParser } from "./configParser";

/**
 * Parses pre-parsed (codec-decoded) data into a {@link FieldPermissionState}.
 *
 * The inverse of {@link FieldPermissionStateSerializer}: the captured config is
 * parsed via the same {@link FieldPermissionConfigParser} as the local YAML, so
 * the base snapshot is validated identically. The domain layer does not depend
 * on YAML; the application layer handles codec decoding before calling this.
 */
export const FieldPermissionStateParser = {
  parse: (parsed: unknown): FieldPermissionState => ({
    config: FieldPermissionConfigParser.parse(parsed),
  }),
};
