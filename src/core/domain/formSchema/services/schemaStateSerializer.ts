import type { SchemaState } from "../state";
import { enrichLayoutWithFields } from "./layoutEnricher";
import { SchemaSerializer } from "./schemaSerializer";

/**
 * Serializes a {@link SchemaState} to a plain object suitable for YAML
 * stringification (via the codec port in the application layer).
 *
 * The schema portion is serialized through the exact same path as `capture`
 * (`enrichLayoutWithFields` -> `SchemaSerializer.serialize`) so that the state
 * snapshot is round-trip compatible with the captured schema.
 *
 * The app revision is NOT written here anymore: it is persisted separately in
 * `state/<appName>/revision.yaml` via `AppRevisionStorage`. The
 * state file therefore contains only the captured snapshot.
 */
export const SchemaStateSerializer = {
  serialize: (state: SchemaState): Record<string, unknown> => {
    const enrichedLayout = enrichLayoutWithFields(
      state.schema.layout,
      state.schema.fields,
    );
    return SchemaSerializer.serialize(enrichedLayout, state.schema.fields);
  },
};
