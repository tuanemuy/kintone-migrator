import type { CustomizationStorage } from "@/core/domain/customization/ports/customizationStorage";
import { LocalFileStorage } from "./storage";

export class LocalFileCustomizationStorage
  extends LocalFileStorage
  implements CustomizationStorage {}
