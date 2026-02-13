export interface SeedStorage {
  get(): Promise<string>;
  update(content: string): Promise<void>;
}
