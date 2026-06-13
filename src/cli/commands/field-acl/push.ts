import * as p from "@clack/prompts";
import { createFieldPermissionCliContainer } from "@/core/application/container/fieldPermissionCli";
import { pushFieldPermission } from "@/core/application/fieldPermission/pushFieldPermission";
import {
  fieldAclArgs,
  resolveFieldAclAppContainerConfig,
  resolveFieldAclContainerConfig,
} from "../../fieldAclConfig";
import { createPushCommand } from "../pushCommandFactory";

export default createPushCommand({
  description:
    "Push the local field permission config to kintone (with drift detection)",
  args: fieldAclArgs,
  subject: "field permission config",
  spinnerStopMessage: "Field permissions pushed to preview.",
  createContainer: createFieldPermissionCliContainer,
  pushFn: pushFieldPermission,
  toctouMessage:
    "The remote changed while applying. Run `field-acl pull` and retry.",
  onResult: (result) => {
    if (result.mode === "firstTime") {
      p.log.warn(
        "No base snapshot found. Applied without drift guard and initialized state.",
      );
    }
  },
  resolveContainerConfig: resolveFieldAclContainerConfig,
  resolveAppContainerConfig: resolveFieldAclAppContainerConfig,
});
