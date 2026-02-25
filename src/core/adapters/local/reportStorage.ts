import type { ReportStorage } from "@/core/domain/report/ports/reportStorage";
import { LocalFileStorage } from "./storage";

export class LocalFileReportStorage
  extends LocalFileStorage
  implements ReportStorage {}
