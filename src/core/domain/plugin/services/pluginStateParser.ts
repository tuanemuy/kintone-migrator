import type { PluginState } from "../state";
import { PluginConfigParser } from "./configParser";

/**
 * Parses pre-parsed (codec-decoded) data into a {@link PluginState}.
 *
 * The inverse of {@link PluginStateSerializer}: the captured config is parsed
 * via the same {@link PluginConfigParser} as the local YAML, so the base
 * snapshot is validated identically. The domain layer does not depend on YAML;
 * the application layer handles codec decoding before calling this.
 */
export const PluginStateParser = {
  parse: (parsed: unknown): PluginState => ({
    config: PluginConfigParser.parse(parsed),
  }),
};
