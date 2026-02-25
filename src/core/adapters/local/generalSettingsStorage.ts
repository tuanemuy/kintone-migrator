import type { GeneralSettingsStorage } from "@/core/domain/generalSettings/ports/generalSettingsStorage";
import { LocalFileStorage } from "./storage";

export class LocalFileGeneralSettingsStorage
  extends LocalFileStorage
  implements GeneralSettingsStorage {}
