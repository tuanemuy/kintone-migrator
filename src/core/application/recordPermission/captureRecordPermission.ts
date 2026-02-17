import { RecordPermissionConfigSerializer } from "@/core/domain/recordPermission/services/configSerializer";
import type { RecordPermissionServiceArgs } from "../container/recordPermission";

export type CaptureRecordPermissionOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};

export async function captureRecordPermission({
  container,
}: RecordPermissionServiceArgs): Promise<CaptureRecordPermissionOutput> {
  const { rights } =
    await container.recordPermissionConfigurator.getRecordPermissions();

  const configText = RecordPermissionConfigSerializer.serialize({ rights });
  const existing = await container.recordPermissionStorage.get();

  return {
    configText,
    hasExistingConfig: existing.exists,
  };
}
