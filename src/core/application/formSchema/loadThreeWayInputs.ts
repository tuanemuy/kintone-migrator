import { Schema } from "@/core/domain/formSchema/entity";
import { enrichLayoutWithFields } from "@/core/domain/formSchema/services/layoutEnricher";
import type { SchemaState } from "@/core/domain/formSchema/state";
import type { FormSchemaDiffContainer } from "../container/formSchema";
import { parseSchemaText } from "./parseSchema";
import { loadState } from "./schemaStateIo";

export type ThreeWayInputs = Readonly<{
  /** Parsed state (base snapshot + revision), or undefined on first run. */
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
 * so it compares like-with-like against base/local after normalization
 * (ADR-007). `getRevision` is read for the drift signal / expected revision but
 * never short-circuits snapshot fetching (ADR-004).
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
  const remote = Schema.create(remoteFields, enrichedRemoteLayout);

  return { state, local, remote, remoteRevision };
}
