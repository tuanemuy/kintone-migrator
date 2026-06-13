import type { GeneralSettingsState } from "../state";
import { GeneralSettingsConfigParser } from "./configParser";

/**
 * Parses pre-parsed (codec-decoded) data into a {@link GeneralSettingsState}.
 *
 * The inverse of {@link GeneralSettingsStateSerializer}: the captured config is
 * parsed via the same {@link GeneralSettingsConfigParser} as the local YAML, so
 * the base snapshot is validated identically. The domain layer does not depend
 * on YAML; the application layer handles codec decoding before calling this.
 */
export const GeneralSettingsStateParser = {
  parse: (parsed: unknown): GeneralSettingsState => ({
    config: GeneralSettingsConfigParser.parse(parsed),
  }),
};
