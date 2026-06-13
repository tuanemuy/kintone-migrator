import * as p from "@clack/prompts";
import { pushAction } from "@/core/application/action/pushAction";
import { createActionCliContainer } from "@/core/application/container/actionCli";
import {
  actionArgs,
  resolveActionAppContainerConfig,
  resolveActionContainerConfig,
} from "../../actionConfig";
import { createPushCommand } from "../pushCommandFactory";

export default createPushCommand({
  description: "Push the local action config to kintone (with drift detection)",
  args: actionArgs,
  subject: "action config",
  spinnerStopMessage: "Actions pushed to preview.",
  createContainer: createActionCliContainer,
  pushFn: pushAction,
  toctouMessage:
    "The remote changed while applying. Run `action pull` and retry.",
  onResult: (result) => {
    if (result.mode === "firstTime") {
      p.log.warn(
        "No base snapshot found. Applied without drift guard and initialized state.",
      );
    }
  },
  resolveContainerConfig: resolveActionContainerConfig,
  resolveAppContainerConfig: resolveActionAppContainerConfig,
});
