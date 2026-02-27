import { createLocalFileSchemaStorage } from "@/core/adapters/local/schemaStorage";
import type { ValidateContainer } from "@/core/application/container/validate";

export type ValidateCliContainerConfig = {
  schemaFilePath: string;
};

export function createValidateCliContainer(
  config: ValidateCliContainerConfig,
): ValidateContainer {
  return {
    schemaStorage: createLocalFileSchemaStorage(config.schemaFilePath),
  };
}
