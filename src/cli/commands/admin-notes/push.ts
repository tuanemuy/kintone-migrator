import * as p from "@clack/prompts";
import { pushAdminNotes } from "@/core/application/adminNotes/pushAdminNotes";
import { createAdminNotesCliContainer } from "@/core/application/container/adminNotesCli";
import {
  adminNotesArgs,
  resolveAdminNotesAppContainerConfig,
  resolveAdminNotesContainerConfig,
} from "../../adminNotesConfig";
import { createPushCommand } from "../pushCommandFactory";

export default createPushCommand({
  description:
    "Push the local admin notes config to kintone (with drift detection)",
  args: adminNotesArgs,
  subject: "admin notes config",
  spinnerStopMessage: "Admin notes pushed to preview.",
  createContainer: createAdminNotesCliContainer,
  pushFn: pushAdminNotes,
  toctouMessage:
    "The remote changed while applying. Run `admin-notes pull` and retry.",
  onResult: (result) => {
    if (result.mode === "firstTime") {
      p.log.warn(
        "No base snapshot found. Applied without drift guard and initialized state.",
      );
    }
  },
  resolveContainerConfig: resolveAdminNotesContainerConfig,
  resolveAppContainerConfig: resolveAdminNotesAppContainerConfig,
});
