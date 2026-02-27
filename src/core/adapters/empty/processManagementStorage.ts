import type { ProcessManagementStorage } from "@/core/domain/processManagement/ports/processManagementStorage";
import { createEmptyStorage } from "./storage";

export const emptyProcessManagementStorage: ProcessManagementStorage =
  createEmptyStorage("EmptyProcessManagementStorage");
