import { createGeneralSettingsCliContainer } from "@/core/application/container/generalSettingsCli";
import type { PullGeneralSettingsOutput } from "@/core/application/generalSettings/pullGeneralSettings";
import {
  applyPulledGeneralSettingsMerge,
  pullGeneralSettings,
} from "@/core/application/generalSettings/pullGeneralSettings";
import {
  resolveSettingsAppContainerConfig,
  resolveSettingsContainerConfig,
  settingsArgs,
} from "../../settingsConfig";
import { createPullCommand } from "../pullCommandFactory";

type SettingsMerged = Extract<PullGeneralSettingsOutput, { mode: "merged" }>;

/** Fixed conflict key for the single (whole-entity) settings config. */
const SETTINGS_CONFLICT_KEY = "settings";

export default createPullCommand<
  Parameters<typeof createGeneralSettingsCliContainer>[0],
  ReturnType<typeof createGeneralSettingsCliContainer>,
  Parameters<typeof resolveSettingsContainerConfig>[0],
  SettingsMerged
>({
  description:
    "Pull remote general settings into the local settings config (3-way merge)",
  args: settingsArgs,
  subject: "general settings config",
  conflictNoun: "settings",
  createContainer: createGeneralSettingsCliContainer,
  pullFn: async ({ container, input }) => {
    const result = await pullGeneralSettings({ container, input });
    if (result.mode === "merged") {
      return { mode: "merged", merged: result };
    }
    return { mode: result.mode };
  },
  getMergeView: (merged) => ({
    hasConflict: merged.merge.hasConflict,
    conflicts: merged.merge.hasConflict ? [{ key: SETTINGS_CONFLICT_KEY }] : [],
  }),
  applyMerge: async ({ container, merged, resolution }) => {
    await applyPulledGeneralSettingsMerge({
      container,
      input: {
        merge: merged.merge,
        resolution: resolution.get(SETTINGS_CONFLICT_KEY),
        remoteConfig: merged.remoteConfig,
        remoteRevision: merged.remoteRevision,
      },
    });
  },
  resolveContainerConfig: resolveSettingsContainerConfig,
  resolveAppContainerConfig: resolveSettingsAppContainerConfig,
});
