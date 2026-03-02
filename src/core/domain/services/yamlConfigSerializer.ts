import { stringify as stringifyYaml } from "yaml";

export function serializeToYaml(data: Record<string, unknown>): string {
  return stringifyYaml(data, {
    lineWidth: 0,
    defaultKeyType: "PLAIN",
    defaultStringType: "PLAIN",
  });
}
