import type { ActionContainer } from "./action";
import type { AdminNotesContainer } from "./adminNotes";
import type { AppPermissionContainer } from "./appPermission";
import type { CustomizationContainer } from "./customization";
import type { FieldPermissionContainer } from "./fieldPermission";
import type { FormSchemaContainer } from "./formSchema";
import type { GeneralSettingsContainer } from "./generalSettings";
import type { NotificationContainer } from "./notification";
import type { PluginContainer } from "./plugin";
import type { ProcessManagementContainer } from "./processManagement";
import type { RecordPermissionContainer } from "./recordPermission";
import type { ReportContainer } from "./report";
import type { SeedContainer } from "./seed";
import type { ViewContainer } from "./view";

/**
 * Aggregates full containers for all 14 domains used by the top-level apply command.
 *
 * Each member uses the full container type (e.g. `CustomizationContainer` = apply & capture & diff)
 * so the same containers can be used for both diff preview (`diffAllForApp`) and apply (`applyAllForApp`).
 */
export type ApplyAllContainers = {
  readonly schema: FormSchemaContainer;
  readonly seed: SeedContainer;
  readonly customization: CustomizationContainer;
  readonly view: ViewContainer;
  readonly settings: GeneralSettingsContainer;
  readonly notification: NotificationContainer;
  readonly report: ReportContainer;
  readonly action: ActionContainer;
  readonly process: ProcessManagementContainer;
  readonly fieldPermission: FieldPermissionContainer;
  readonly appPermission: AppPermissionContainer;
  readonly recordPermission: RecordPermissionContainer;
  readonly adminNotes: AdminNotesContainer;
  readonly plugin: PluginContainer;
};
