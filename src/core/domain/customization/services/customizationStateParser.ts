import type { CustomizationState } from "../state";
import { CustomizationConfigParser } from "./configParser";

/**
 * Parses pre-parsed (codec-decoded) data into a {@link CustomizationState}.
 *
 * The inverse of {@link CustomizationStateSerializer}: the captured config is
 * parsed via the same {@link CustomizationConfigParser} as the local YAML, so
 * the base snapshot is validated identically. The domain layer does not depend
 * on YAML; the application layer handles codec decoding before calling this.
 */
export const CustomizationStateParser = {
  parse: (parsed: unknown): CustomizationState => ({
    config: CustomizationConfigParser.parse(parsed),
  }),
};
