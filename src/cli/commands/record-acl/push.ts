import * as p from "@clack/prompts";
import { createRecordPermissionCliContainer } from "@/core/application/container/recordPermissionCli";
import { pushRecordPermission } from "@/core/application/recordPermission/pushRecordPermission";
import {
  recordAclArgs,
  resolveRecordAclAppContainerConfig,
  resolveRecordAclContainerConfig,
} from "../../recordAclConfig";
import { createPushCommand } from "../pushCommandFactory";

export default createPushCommand({
  description:
    "Push the local record permission config to kintone (with drift detection)",
  args: recordAclArgs,
  subject: "record permission config",
  spinnerStopMessage: "Record permissions pushed to preview.",
  createContainer: createRecordPermissionCliContainer,
  pushFn: pushRecordPermission,
  toctouMessage:
    "The remote changed while applying. Run `record-acl pull` and retry.",
  onResult: (result) => {
    if (result.mode === "firstTime") {
      p.log.warn(
        "No base snapshot found. Applied without drift guard and initialized state.",
      );
    }
  },
  resolveContainerConfig: resolveRecordAclContainerConfig,
  resolveAppContainerConfig: resolveRecordAclAppContainerConfig,
});
