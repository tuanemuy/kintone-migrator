import type { SchemaState } from "../state";
import { enrichLayoutWithFields } from "./layoutEnricher";
import { SchemaSerializer } from "./schemaSerializer";

/**
 * Serializes a {@link SchemaState} to a plain object suitable for YAML
 * stringification (via the codec port in the application layer).
 *
 * The schema portion is serialized through the exact same path as `capture`
 * (`enrichLayoutWithFields` -> `SchemaSerializer.serialize`) so that the state
 * snapshot is round-trip compatible with the captured schema (ADR-007). The
 * top-level `revision` is added alongside the captured `layout`.
 */
export const SchemaStateSerializer = {
  serialize: (state: SchemaState): Record<string, unknown> => {
    const enrichedLayout = enrichLayoutWithFields(
      state.schema.layout,
      state.schema.fields,
    );
    return {
      revision: state.revision,
      ...SchemaSerializer.serialize(enrichedLayout, state.schema.fields),
    };
  },
};
