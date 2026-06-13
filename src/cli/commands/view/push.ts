import * as p from "@clack/prompts";
import { createViewCliContainer } from "@/core/application/container/viewCli";
import { pushView } from "@/core/application/view/pushView";
import {
  resolveViewAppContainerConfig,
  resolveViewContainerConfig,
  viewArgs,
} from "../../viewConfig";
import { createPushCommand } from "../pushCommandFactory";

export default createPushCommand({
  description: "Push the local view config to kintone (with drift detection)",
  args: viewArgs,
  subject: "view config",
  spinnerStopMessage: "Views pushed to preview.",
  createContainer: createViewCliContainer,
  pushFn: pushView,
  toctouMessage:
    "The remote changed while applying. Run `view pull` and retry.",
  onResult: (result) => {
    if (result.mode === "firstTime") {
      p.log.warn(
        "No base snapshot found. Applied without drift guard and initialized state.",
      );
    }
    if (result.skippedBuiltinViews.length > 0) {
      p.log.warn(
        `Skipped builtin views (cannot be updated): ${result.skippedBuiltinViews.join(", ")}`,
      );
    }
  },
  resolveContainerConfig: resolveViewContainerConfig,
  resolveAppContainerConfig: resolveViewAppContainerConfig,
});
