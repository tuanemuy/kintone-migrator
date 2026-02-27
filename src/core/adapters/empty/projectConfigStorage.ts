import type { ProjectConfigStorage } from "@/core/domain/projectConfig/ports/projectConfigStorage";
import { createEmptyStorage } from "./storage";

export const emptyProjectConfigStorage: ProjectConfigStorage =
  createEmptyStorage("EmptyProjectConfigStorage");
