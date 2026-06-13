import type { ReportStateStorage } from "@/core/domain/report/ports/reportStateStorage";
import { createLocalFileStorage } from "./storage";

export function createLocalFileReportStateStorage(
  filePath: string,
): ReportStateStorage {
  return createLocalFileStorage(filePath, "report state file");
}
