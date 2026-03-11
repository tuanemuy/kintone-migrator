export interface ConfigCodec {
  parse(text: string): unknown;
  stringify(data: Record<string, unknown>): string;
}
