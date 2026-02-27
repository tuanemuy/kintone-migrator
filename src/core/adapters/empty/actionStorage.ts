import type { ActionStorage } from "@/core/domain/action/ports/actionStorage";
import { createEmptyStorage } from "./storage";

export const emptyActionStorage: ActionStorage =
  createEmptyStorage("EmptyActionStorage");
