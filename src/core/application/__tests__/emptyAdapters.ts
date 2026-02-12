import { EmptyAppDeployer } from "@/core/adapters/empty/appDeployer";
import { EmptyFormConfigurator } from "@/core/adapters/empty/formConfigurator";
import { EmptySchemaStorage } from "@/core/adapters/empty/schemaStorage";
import type { Container } from "@/core/application/container";

export { EmptyAppDeployer, EmptyFormConfigurator, EmptySchemaStorage };

export function createEmptyContainer(): Container {
  return {
    formConfigurator: new EmptyFormConfigurator(),
    schemaStorage: new EmptySchemaStorage(),
    appDeployer: new EmptyAppDeployer(),
  };
}
