import type { ReportServiceArgs } from "../container/report";

export type SaveReportInput = {
  readonly configText: string;
};

export async function saveReport({
  container,
  input,
}: ReportServiceArgs<SaveReportInput>): Promise<void> {
  await container.reportStorage.update(input.configText);
}
