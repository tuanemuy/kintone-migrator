import type { SeedStorage } from "@/core/domain/seedData/ports/seedStorage";
import { LocalFileStorage } from "./storage";

export class LocalFileSeedStorage
  extends LocalFileStorage
  implements SeedStorage {}
