import * as p from "@clack/prompts";
import { createProcessManagementCliContainer } from "@/core/application/container/processManagementCli";
import { pushProcessManagement } from "@/core/application/processManagement/pushProcessManagement";
import {
  processArgs,
  resolveProcessAppContainerConfig,
  resolveProcessContainerConfig,
} from "../../processConfig";
import { createPushCommand } from "../pushCommandFactory";

export default createPushCommand({
  description:
    "Push the local process management config to kintone (with drift detection)",
  args: processArgs,
  subject: "process management config",
  spinnerStopMessage: "Process management pushed to preview.",
  createContainer: createProcessManagementCliContainer,
  pushFn: pushProcessManagement,
  toctouMessage:
    "The remote changed while applying. Run `process pull` and retry.",
  onResult: (result) => {
    if (result.mode === "firstTime") {
      p.log.warn(
        "No base snapshot found. Applied without drift guard and initialized state.",
      );
    }
  },
  resolveContainerConfig: resolveProcessContainerConfig,
  resolveAppContainerConfig: resolveProcessAppContainerConfig,
});
