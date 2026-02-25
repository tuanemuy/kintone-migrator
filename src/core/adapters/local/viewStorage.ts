import type { ViewStorage } from "@/core/domain/view/ports/viewStorage";
import { LocalFileStorage } from "./storage";

export class LocalFileViewStorage
  extends LocalFileStorage
  implements ViewStorage {}
