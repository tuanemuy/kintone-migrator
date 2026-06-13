import type { ActionState } from "../state";
import { ActionConfigParser } from "./configParser";

/**
 * Parses pre-parsed (codec-decoded) data into an {@link ActionState}.
 *
 * The inverse of {@link ActionStateSerializer}: the captured config is parsed
 * via the same {@link ActionConfigParser} as the local YAML, so the base
 * snapshot is validated identically. The domain layer does not depend on YAML;
 * the application layer handles codec decoding before calling this.
 */
export const ActionStateParser = {
  parse: (parsed: unknown): ActionState => ({
    config: ActionConfigParser.parse(parsed),
  }),
};
