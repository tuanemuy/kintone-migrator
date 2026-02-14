export interface CustomizationStorage {
  get(): Promise<{ content: string; exists: boolean }>;
}
