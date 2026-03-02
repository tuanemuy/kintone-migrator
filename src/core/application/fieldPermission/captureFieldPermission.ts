import { FieldPermissionConfigSerializer } from "@/core/domain/fieldPermission/services/configSerializer";
import {
  type CaptureOutput,
  captureFromConfig,
} from "../captureFromConfigBase";
import type { FieldPermissionServiceArgs } from "../container/fieldPermission";

export type CaptureFieldPermissionOutput = CaptureOutput;

export async function captureFieldPermission({
  container,
}: FieldPermissionServiceArgs): Promise<CaptureFieldPermissionOutput> {
  return captureFromConfig({
    fetchRemote: () =>
      container.fieldPermissionConfigurator.getFieldPermissions(),
    serialize: ({ rights }) =>
      FieldPermissionConfigSerializer.serialize({ rights }),
    getStorage: () => container.fieldPermissionStorage.get(),
  });
}
