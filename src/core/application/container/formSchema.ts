import type { AppRevisionStorage } from "@/core/domain/appRevision/ports/appRevisionStorage";
import type { FormConfigurator } from "@/core/domain/formSchema/ports/formConfigurator";
import type { SchemaStateStorage } from "@/core/domain/formSchema/ports/schemaStateStorage";
import type { SchemaStorage } from "@/core/domain/formSchema/ports/schemaStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ServiceArgs } from "../types";

/** Ports needed by schema diff (subset of full container) */
export type FormSchemaDiffContainer = {
  configCodec: ConfigCodec;
  formConfigurator: FormConfigurator;
  schemaStorage: SchemaStorage;
  // Base snapshot storage for 3-way diff/pull/push. Added to the diff (base)
  // container so it is also injected into the full container (push/pull) via
  // inheritance. Legacy migrate/capture also receive it but never read/write it.
  schemaStateStorage: SchemaStateStorage;
  // App-scoped base revision storage (shared across domains).
  // The schema snapshot no longer carries the revision; it is persisted here.
  appRevisionStorage: AppRevisionStorage;
};

export type FormSchemaContainer = FormSchemaDiffContainer & {
  appDeployer: AppDeployer;
};

export type FormSchemaServiceArgs<T = undefined> = ServiceArgs<
  FormSchemaContainer,
  T
>;

export type FormSchemaDiffServiceArgs<T = undefined> = ServiceArgs<
  FormSchemaDiffContainer,
  T
>;
