import type { ReportStorage } from "@/core/domain/report/ports/reportStorage";
import { createEmptyStorage } from "./storage";

export const emptyReportStorage: ReportStorage =
  createEmptyStorage("EmptyReportStorage");
