import { captureAdminNotes } from "@/core/application/adminNotes/captureAdminNotes";
import { saveAdminNotes } from "@/core/application/adminNotes/saveAdminNotes";
import { createAdminNotesCliContainer } from "@/core/application/container/adminNotesCli";
import {
  adminNotesArgs,
  resolveAdminNotesAppContainerConfig,
  resolveAdminNotesContainerConfig,
} from "../../adminNotesConfig";
import { createCaptureCommand } from "../captureCommandFactory";

export default createCaptureCommand({
  description: "Capture current admin notes from kintone app to file",
  args: adminNotesArgs,
  spinnerMessage: "Capturing admin notes...",
  spinnerStopMessage: "Admin notes captured.",
  domainLabel: "Admin notes",
  multiAppSuccessMessage: "All admin notes captures completed successfully.",
  createContainer: createAdminNotesCliContainer,
  captureFn: captureAdminNotes,
  saveFn: saveAdminNotes,
  getConfigFilePath: (config) => config.adminNotesFilePath,
  resolveContainerConfig: resolveAdminNotesContainerConfig,
  resolveAppContainerConfig: resolveAdminNotesAppContainerConfig,
});
