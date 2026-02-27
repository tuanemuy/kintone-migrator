import type { GeneralSettingsStorage } from "@/core/domain/generalSettings/ports/generalSettingsStorage";
import { createEmptyStorage } from "./storage";

export const emptyGeneralSettingsStorage: GeneralSettingsStorage =
  createEmptyStorage("EmptyGeneralSettingsStorage");
