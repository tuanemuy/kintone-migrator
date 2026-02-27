import type { SchemaStorage } from "@/core/domain/formSchema/ports/schemaStorage";
import type { ServiceArgs } from "../types";

export type ValidateContainer = {
  schemaStorage: SchemaStorage;
};

export type ValidateServiceArgs<T = undefined> = ServiceArgs<
  ValidateContainer,
  T
>;
