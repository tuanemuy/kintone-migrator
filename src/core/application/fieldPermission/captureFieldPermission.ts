import { FieldPermissionConfigSerializer } from "@/core/domain/fieldPermission/services/configSerializer";
import type { FieldPermissionServiceArgs } from "../container/fieldPermission";

export type CaptureFieldPermissionOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};

export async function captureFieldPermission({
  container,
}: FieldPermissionServiceArgs): Promise<CaptureFieldPermissionOutput> {
  const { rights } =
    await container.fieldPermissionConfigurator.getFieldPermissions();

  const configText = FieldPermissionConfigSerializer.serialize({ rights });
  const existing = await container.fieldPermissionStorage.get();

  return {
    configText,
    hasExistingConfig: existing.exists,
  };
}
