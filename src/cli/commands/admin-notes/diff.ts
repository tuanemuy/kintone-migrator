import { detectAdminNotesDiff } from "@/core/application/adminNotes/detectAdminNotesDiff";
import { createAdminNotesCliContainer } from "@/core/application/container/adminNotesCli";
import {
  adminNotesArgs,
  resolveAdminNotesAppContainerConfig,
  resolveAdminNotesContainerConfig,
} from "../../adminNotesConfig";
import { printAdminNotesDiffResult } from "../../output";
import { createDiffCommand } from "../diffCommandFactory";

export default createDiffCommand({
  description: "Compare local admin notes config with remote kintone app",
  args: adminNotesArgs,
  spinnerMessage: "Comparing admin notes...",
  createContainer: createAdminNotesCliContainer,
  detectDiff: detectAdminNotesDiff,
  printResult: printAdminNotesDiffResult,
  resolveContainerConfig: resolveAdminNotesContainerConfig,
  resolveAppContainerConfig: resolveAdminNotesAppContainerConfig,
});
