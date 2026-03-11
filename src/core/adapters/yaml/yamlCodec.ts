import { parse, stringify } from "yaml";
import type { YamlCodec } from "@/core/domain/ports/yamlCodec";

export const yamlCodec: YamlCodec = {
  parse: (text: string): unknown => parse(text),
  stringify: (data: Record<string, unknown>): string =>
    stringify(data, {
      lineWidth: 0,
      defaultKeyType: "PLAIN",
      defaultStringType: "PLAIN",
    }),
};
