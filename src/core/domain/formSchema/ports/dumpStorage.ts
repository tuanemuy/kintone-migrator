/**
 * Port for persisting raw form dump data (fields and layout JSON).
 */
export interface DumpStorage {
  saveFields(content: string): Promise<void>;
  saveLayout(content: string): Promise<void>;
}
