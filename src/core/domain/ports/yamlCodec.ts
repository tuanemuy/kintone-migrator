export interface YamlCodec {
  parse(text: string): unknown;
  stringify(data: Record<string, unknown>): string;
}
