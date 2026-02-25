import type { FormConfigurator } from "@/core/domain/formSchema/ports/formConfigurator";
import type { SchemaStorage } from "@/core/domain/formSchema/ports/schemaStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";

export type FormSchemaContainer = {
  formConfigurator: FormConfigurator;
  schemaStorage: SchemaStorage;
  appDeployer: AppDeployer;
};
