import type { SeedStorage } from "@/core/domain/seedData/ports/seedStorage";
import { createEmptyStorage } from "./storage";

export const emptySeedStorage: SeedStorage =
  createEmptyStorage("EmptySeedStorage");
