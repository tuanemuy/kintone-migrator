import { createLocalFileSchemaStorage } from "@/core/adapters/local/schemaStorage";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import type { ValidateContainer } from "@/core/application/container/validate";

export type ValidateCliContainerConfig = {
  schemaFilePath: string;
};

export function createValidateCliContainer(
  config: ValidateCliContainerConfig,
): ValidateContainer {
  return {
    configCodec,
    schemaStorage: createLocalFileSchemaStorage(config.schemaFilePath),
  };
}
