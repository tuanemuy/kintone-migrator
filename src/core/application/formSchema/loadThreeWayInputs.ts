import { Schema } from "@/core/domain/formSchema/entity";
import { enrichLayoutWithFields } from "@/core/domain/formSchema/services/layoutEnricher";
import type { SchemaState } from "@/core/domain/formSchema/state";
import type { FormSchemaDiffContainer } from "../container/formSchema";
import { parseSchemaText } from "./parseSchema";
import { loadState } from "./schemaStateIo";

export type ThreeWayInputs = Readonly<{
  /** Parsed state (base snapshot), or undefined on first run. */
  state: SchemaState | undefined;
  /** Local schema parsed from the YAML file, or undefined when absent. */
  local: Schema | undefined;
  /** Remote schema reconstructed from getFields/getLayout. */
  remote: Schema;
  /** Current remote (preview) revision observed via getRevision. */
  remoteRevision: string;
}>;

/**
 * Loads the three inputs of a 3-way schema sync: the base snapshot (state), the
 * local YAML schema, and the remote schema, plus the current remote revision.
 *
 * The remote schema is reconstructed via the same enrichment path as `capture`
 * so it compares like-with-like against base/local after normalization. `getRevision` is read for the drift signal / expected revision but
 * never short-circuits snapshot fetching.
 */
export async function loadThreeWayInputs(
  container: FormSchemaDiffContainer,
): Promise<ThreeWayInputs> {
  const [state, localResult, remoteFields, remoteLayout, remoteRevision] =
    await Promise.all([
      loadState(container.schemaStateStorage, container.configCodec),
      container.schemaStorage.get(),
      container.formConfigurator.getFields(),
      container.formConfigurator.getLayout(),
      container.formConfigurator.getRevision(),
    ]);

  const local = localResult.exists
    ? parseSchemaText(container.configCodec, localResult.content)
    : undefined;

  const enrichedRemoteLayout = enrichLayoutWithFields(
    remoteLayout,
    remoteFields,
  );
  // base/local are layout-derived (round-tripped through SchemaSerializer /
  // SchemaParser, which serialize layout only), so their field maps contain only
  // layout-placed fields. The remote field map (getFields) is the full set and
  // is NOT re-derived from layout here, so it could in principle retain a
  // layout-non-placed field that base/local lack. In kintone, however, every
  // field is always placed in the form layout, so getFields and the layout-
  // derived field set coincide and no asymmetry arises in practice. The 3-way
  // normalization (normalizeForThreeWay) only drops GROUP / subtable-inner, not
  // layout-non-placed fields, so this relies on that kintone invariant rather
  // than re-deriving remote fields from layout.
  const remote = Schema.create(remoteFields, enrichedRemoteLayout);

  return { state, local, remote, remoteRevision };
}
