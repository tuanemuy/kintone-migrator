import { AppPermissionConfigSerializer } from "@/core/domain/appPermission/services/configSerializer";
import {
  type CaptureOutput,
  captureFromConfig,
} from "../captureFromConfigBase";
import type { AppPermissionServiceArgs } from "../container/appPermission";
import { stringifyToYaml } from "../stringifyToYaml";

export type CaptureAppPermissionOutput = CaptureOutput;

export async function captureAppPermission({
  container,
}: AppPermissionServiceArgs): Promise<CaptureAppPermissionOutput> {
  return captureFromConfig({
    fetchRemote: () => container.appPermissionConfigurator.getAppPermissions(),
    serialize: ({ rights }) =>
      stringifyToYaml(
        container.configCodec,
        AppPermissionConfigSerializer.serialize({ rights }),
      ),
    getStorage: () => container.appPermissionStorage.get(),
  });
}
