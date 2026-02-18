import { EmptyAppDeployer } from "@/core/adapters/empty/appDeployer";
import { EmptyFormConfigurator } from "@/core/adapters/empty/formConfigurator";
import { LocalFileSchemaStorage } from "@/core/adapters/local/schemaStorage";
import type { Container } from "@/core/application/container";

export type ValidateCliContainerConfig = {
  schemaFilePath: string;
};

export function createValidateCliContainer(
  config: ValidateCliContainerConfig,
): Container {
  return {
    formConfigurator: new EmptyFormConfigurator(),
    schemaStorage: new LocalFileSchemaStorage(config.schemaFilePath),
    appDeployer: new EmptyAppDeployer(),
  };
}
