import type { ReportStorage } from "@/core/domain/report/ports/reportStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileReportStorage(filePath: string): ReportStorage {
  return createLocalFileStorage(filePath, "report file");
}
