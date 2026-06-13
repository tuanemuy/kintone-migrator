import type { NotificationState } from "../state";
import { NotificationConfigParser } from "./configParser";

/**
 * Parses pre-parsed (codec-decoded) data into a {@link NotificationState}.
 *
 * The inverse of {@link NotificationStateSerializer}: the captured config is
 * parsed via the same {@link NotificationConfigParser} as the local YAML, so the
 * base snapshot is validated identically. The domain layer does not depend on
 * YAML; the application layer handles codec decoding before calling this.
 */
export const NotificationStateParser = {
  parse: (parsed: unknown): NotificationState => ({
    config: NotificationConfigParser.parse(parsed),
  }),
};
