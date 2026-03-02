export const DomainServiceErrorCode = {
  YamlSerializationFailed: "DS_YAML_SERIALIZATION_FAILED",
} as const;

export type DomainServiceErrorCode =
  (typeof DomainServiceErrorCode)[keyof typeof DomainServiceErrorCode];
