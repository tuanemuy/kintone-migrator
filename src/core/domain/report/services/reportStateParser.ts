import type { ReportState } from "../state";
import { ReportConfigParser } from "./configParser";

/**
 * Parses pre-parsed (codec-decoded) data into a {@link ReportState}.
 *
 * The inverse of {@link ReportStateSerializer}: the captured config is parsed
 * via the same {@link ReportConfigParser} as the local YAML, so the base
 * snapshot is validated identically. The domain layer does not depend on YAML;
 * the application layer handles codec decoding before calling this.
 */
export const ReportStateParser = {
  parse: (parsed: unknown): ReportState => ({
    config: ReportConfigParser.parse(parsed),
  }),
};
