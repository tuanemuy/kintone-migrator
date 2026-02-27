import type { ViewStorage } from "@/core/domain/view/ports/viewStorage";
import { createEmptyStorage } from "./storage";

export const emptyViewStorage: ViewStorage =
  createEmptyStorage("EmptyViewStorage");
