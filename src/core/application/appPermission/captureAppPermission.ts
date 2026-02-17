import { AppPermissionConfigSerializer } from "@/core/domain/appPermission/services/configSerializer";
import type { AppPermissionServiceArgs } from "../container/appPermission";

export type CaptureAppPermissionOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};

export async function captureAppPermission({
  container,
}: AppPermissionServiceArgs): Promise<CaptureAppPermissionOutput> {
  const { rights } =
    await container.appPermissionConfigurator.getAppPermissions();

  const configText = AppPermissionConfigSerializer.serialize({ rights });
  const existing = await container.appPermissionStorage.get();

  return {
    configText,
    hasExistingConfig: existing.exists,
  };
}
