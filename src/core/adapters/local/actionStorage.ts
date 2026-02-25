import type { ActionStorage } from "@/core/domain/action/ports/actionStorage";
import { LocalFileStorage } from "./storage";

export class LocalFileActionStorage
  extends LocalFileStorage
  implements ActionStorage {}
