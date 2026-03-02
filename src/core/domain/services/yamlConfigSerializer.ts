import { stringify as stringifyYaml } from "yaml";

export function serializeToYaml(data: unknown): string {
  return stringifyYaml(data, {
    lineWidth: 0,
    defaultKeyType: "PLAIN",
    defaultStringType: "PLAIN",
  });
}
