import type { SeedStorage } from "@/core/domain/seedData/ports/seedStorage";

export class EmptySeedStorage implements SeedStorage {
  async get(): Promise<string> {
    throw new Error("EmptySeedStorage.get not implemented");
  }

  async update(_content: string): Promise<void> {
    throw new Error("EmptySeedStorage.update not implemented");
  }
}
