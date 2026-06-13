import type { RecordPermissionState } from "../state";
import { RecordPermissionConfigParser } from "./configParser";

/**
 * Parses pre-parsed (codec-decoded) data into a {@link RecordPermissionState}.
 *
 * The inverse of {@link RecordPermissionStateSerializer}: the captured config is
 * parsed via the same {@link RecordPermissionConfigParser} as the local YAML, so
 * the base snapshot is validated identically. The domain layer does not depend
 * on YAML; the application layer handles codec decoding before calling this.
 */
export const RecordPermissionStateParser = {
  parse: (parsed: unknown): RecordPermissionState => ({
    config: RecordPermissionConfigParser.parse(parsed),
  }),
};
