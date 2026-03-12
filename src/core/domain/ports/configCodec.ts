export interface ConfigCodec {
  /** Parse config text into a JavaScript value. Throws on malformed input. */
  parse(text: string): unknown;
  /** Serialize a config object to a string representation. Throws on failure. */
  stringify(data: Record<string, unknown>): string;
}
