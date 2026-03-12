import { parse, stringify } from "yaml";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";

export const configCodec: ConfigCodec = {
  parse: (text: string): unknown => parse(text),
  stringify: (data: Record<string, unknown> | readonly unknown[]): string =>
    stringify(data, {
      lineWidth: 0,
      defaultKeyType: "PLAIN",
      defaultStringType: "PLAIN",
    }),
};
