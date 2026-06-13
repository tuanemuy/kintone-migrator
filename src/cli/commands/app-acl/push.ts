import * as p from "@clack/prompts";
import { pushAppPermission } from "@/core/application/appPermission/pushAppPermission";
import { createAppPermissionCliContainer } from "@/core/application/container/appPermissionCli";
import {
  appAclArgs,
  resolveAppAclAppContainerConfig,
  resolveAppAclContainerConfig,
} from "../../appAclConfig";
import { createPushCommand } from "../pushCommandFactory";

export default createPushCommand({
  description:
    "Push the local app permission config to kintone (with drift detection)",
  args: appAclArgs,
  subject: "app permission config",
  spinnerStopMessage: "App permissions pushed to preview.",
  createContainer: createAppPermissionCliContainer,
  pushFn: pushAppPermission,
  toctouMessage:
    "The remote changed while applying. Run `app-acl pull` and retry.",
  onResult: (result) => {
    if (result.mode === "firstTime") {
      p.log.warn(
        "No base snapshot found. Applied without drift guard and initialized state.",
      );
    }
  },
  resolveContainerConfig: resolveAppAclContainerConfig,
  resolveAppContainerConfig: resolveAppAclAppContainerConfig,
});
