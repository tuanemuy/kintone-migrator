import { isRecord } from "@/core/domain/typeGuards";
import type { SchemaState } from "../state";
import { type SchemaParseOptions, SchemaParser } from "./schemaParser";

const STATE_OPTIONS: SchemaParseOptions = { relatedAppWithBothKeys: "app" };

/**
 * Parses pre-parsed (codec-decoded) data into a {@link SchemaState}.
 *
 * This is the inverse of {@link SchemaStateSerializer}. The captured `layout`
 * is parsed via {@link SchemaParser}.
 *
 * Backward compatibility: older state files embedded a top-level
 * `revision` field alongside the captured `layout`. revision is now stored
 * separately in `state/<appName>/revision.yaml`, so any residual top-level
 * `revision` is stripped and ignored here — the snapshot is parsed from the
 * remainder. Older state files also hold a lookup's `relatedApp` as both `app`
 * and `code`; it is read by `app` (see {@link SchemaParseOptions}). The domain
 * layer does not depend on YAML; the application layer
 * handles codec decoding before calling this.
 */
export const SchemaStateParser = {
  parse: (parsed: unknown): SchemaState => {
    // Strip a legacy top-level `revision` (now stored separately) before
    // parsing the snapshot. A non-record input falls through to SchemaParser,
    // which raises the appropriate BusinessRuleError.
    const rest = isRecord(parsed)
      ? (() => {
          const { revision: _legacyRevision, ...withoutRevision } = parsed;
          return withoutRevision;
        })()
      : parsed;

    const schema = SchemaParser.parse(rest, STATE_OPTIONS);

    return { schema };
  },
};
