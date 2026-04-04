import { applyAdminNotes } from "@/core/application/adminNotes/applyAdminNotes";
import { detectAdminNotesDiff } from "@/core/application/adminNotes/detectAdminNotesDiff";
import { createAdminNotesCliContainer } from "@/core/application/container/adminNotesCli";
import {
  adminNotesArgs,
  resolveAdminNotesAppContainerConfig,
  resolveAdminNotesContainerConfig,
} from "../../adminNotesConfig";
import { printAdminNotesDiffResult } from "../../output";
import { createApplyCommand } from "../applyCommandFactory";

export default createApplyCommand({
  description: "Apply admin notes from YAML to kintone app",
  args: adminNotesArgs,
  spinnerMessage: "Applying admin notes...",
  spinnerStopMessage: "Admin notes applied.",
  successMessage: "Admin notes applied successfully.",
  createContainer: createAdminNotesCliContainer,
  applyFn: applyAdminNotes,
  diffPreview: {
    detectDiff: detectAdminNotesDiff,
    printResult: printAdminNotesDiffResult,
  },
  resolveContainerConfig: resolveAdminNotesContainerConfig,
  resolveAppContainerConfig: resolveAdminNotesAppContainerConfig,
});
