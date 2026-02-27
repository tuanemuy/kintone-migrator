import type { CustomizationStorage } from "@/core/domain/customization/ports/customizationStorage";
import { createEmptyStorage } from "./storage";

export const emptyCustomizationStorage: CustomizationStorage =
  createEmptyStorage("EmptyCustomizationStorage");
