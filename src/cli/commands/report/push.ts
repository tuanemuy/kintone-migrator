import * as p from "@clack/prompts";
import { createReportCliContainer } from "@/core/application/container/reportCli";
import { pushReport } from "@/core/application/report/pushReport";
import {
  reportArgs,
  resolveReportAppContainerConfig,
  resolveReportContainerConfig,
} from "../../reportConfig";
import { createPushCommand } from "../pushCommandFactory";

export default createPushCommand({
  description: "Push the local report config to kintone (with drift detection)",
  args: reportArgs,
  subject: "report config",
  spinnerStopMessage: "Reports pushed to preview.",
  createContainer: createReportCliContainer,
  pushFn: pushReport,
  toctouMessage:
    "The remote changed while applying. Run `report pull` and retry.",
  onResult: (result) => {
    if (result.mode === "firstTime") {
      p.log.warn(
        "No base snapshot found. Applied without drift guard and initialized state.",
      );
    }
  },
  resolveContainerConfig: resolveReportContainerConfig,
  resolveAppContainerConfig: resolveReportAppContainerConfig,
});
