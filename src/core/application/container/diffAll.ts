import type { ActionDiffContainer } from "./action";
import type { AdminNotesDiffContainer } from "./adminNotes";
import type { AppPermissionDiffContainer } from "./appPermission";
import type { CustomizationDiffContainer } from "./customization";
import type { FieldPermissionDiffContainer } from "./fieldPermission";
import type { FormSchemaDiffContainer } from "./formSchema";
import type { GeneralSettingsDiffContainer } from "./generalSettings";
import type { NotificationDiffContainer } from "./notification";
import type { PluginDiffContainer } from "./plugin";
import type { ProcessManagementDiffContainer } from "./processManagement";
import type { RecordPermissionDiffContainer } from "./recordPermission";
import type { ReportDiffContainer } from "./report";
import type { ViewDiffContainer } from "./view";

/**
 * Aggregates diff-specific containers for all 13 domains (seed excluded).
 * Each member uses the minimal `*DiffContainer` type, which requires only
 * the ports needed for diff detection.
 */
export type DiffAllContainers = {
  readonly schema: FormSchemaDiffContainer;
  readonly customization: CustomizationDiffContainer;
  readonly view: ViewDiffContainer;
  readonly settings: GeneralSettingsDiffContainer;
  readonly notification: NotificationDiffContainer;
  readonly report: ReportDiffContainer;
  readonly action: ActionDiffContainer;
  readonly process: ProcessManagementDiffContainer;
  readonly fieldPermission: FieldPermissionDiffContainer;
  readonly appPermission: AppPermissionDiffContainer;
  readonly recordPermission: RecordPermissionDiffContainer;
  readonly adminNotes: AdminNotesDiffContainer;
  readonly plugin: PluginDiffContainer;
};
