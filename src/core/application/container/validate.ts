import type { SchemaStorage } from "@/core/domain/formSchema/ports/schemaStorage";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ServiceArgs } from "../types";

export type ValidateContainer = {
  configCodec: ConfigCodec;
  schemaStorage: SchemaStorage;
};

export type ValidateServiceArgs<T = undefined> = ServiceArgs<
  ValidateContainer,
  T
>;
