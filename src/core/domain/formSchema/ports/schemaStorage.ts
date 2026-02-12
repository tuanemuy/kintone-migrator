export interface SchemaStorage {
  get(): Promise<string>;
  update(content: string): Promise<void>;
}
