import type { ProjectConfigStorage } from "@/core/domain/projectConfig/ports/projectConfigStorage";
import { LocalFileStorage } from "./storage";

export class LocalFileProjectConfigStorage
  extends LocalFileStorage
  implements ProjectConfigStorage {}
