import type { ViewState } from "../state";
import { ViewConfigParser } from "./configParser";

/**
 * Parses pre-parsed (codec-decoded) data into a {@link ViewState}.
 *
 * The inverse of {@link ViewStateSerializer}: the captured config is parsed via
 * the same {@link ViewConfigParser} as the local YAML, so the base snapshot is
 * validated identically. The domain layer does not depend on YAML; the
 * application layer handles codec decoding before calling this.
 */
export const ViewStateParser = {
  parse: (parsed: unknown): ViewState => ({
    config: ViewConfigParser.parse(parsed),
  }),
};
