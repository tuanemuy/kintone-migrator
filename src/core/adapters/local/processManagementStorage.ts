import type { ProcessManagementStorage } from "@/core/domain/processManagement/ports/processManagementStorage";
import { LocalFileStorage } from "./storage";

export class LocalFileProcessManagementStorage
  extends LocalFileStorage
  implements ProcessManagementStorage {}
