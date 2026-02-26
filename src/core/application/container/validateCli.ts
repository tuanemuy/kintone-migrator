import { EmptyAppDeployer } from "@/core/adapters/empty/appDeployer";
import { EmptyFormConfigurator } from "@/core/adapters/empty/formConfigurator";
import { LocalFileSchemaStorage } from "@/core/adapters/local/schemaStorage";
import type { FormSchemaContainer } from "@/core/application/container/formSchema";

export type ValidateCliContainerConfig = {
  schemaFilePath: string;
};

export function createValidateCliContainer(
  config: ValidateCliContainerConfig,
): FormSchemaContainer {
  return {
    formConfigurator: new EmptyFormConfigurator(),
    schemaStorage: new LocalFileSchemaStorage(config.schemaFilePath),
    appDeployer: new EmptyAppDeployer(),
  };
}
