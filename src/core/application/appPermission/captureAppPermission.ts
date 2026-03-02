import { AppPermissionConfigSerializer } from "@/core/domain/appPermission/services/configSerializer";
import {
  type CaptureOutput,
  captureFromConfig,
} from "../captureFromConfigBase";
import type { AppPermissionServiceArgs } from "../container/appPermission";

export type CaptureAppPermissionOutput = CaptureOutput;

export async function captureAppPermission({
  container,
}: AppPermissionServiceArgs): Promise<CaptureAppPermissionOutput> {
  return captureFromConfig({
    fetchRemote: () => container.appPermissionConfigurator.getAppPermissions(),
    serialize: ({ rights }) =>
      AppPermissionConfigSerializer.serialize({ rights }),
    getStorage: () => container.appPermissionStorage.get(),
  });
}
