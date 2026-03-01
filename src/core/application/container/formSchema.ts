import type { FormConfigurator } from "@/core/domain/formSchema/ports/formConfigurator";
import type { SchemaStorage } from "@/core/domain/formSchema/ports/schemaStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ServiceArgs } from "../types";

/** Ports needed by schema diff (subset of full container) */
export type FormSchemaDiffContainer = {
  formConfigurator: FormConfigurator;
  schemaStorage: SchemaStorage;
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
