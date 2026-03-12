import { RecordPermissionConfigSerializer } from "@/core/domain/recordPermission/services/configSerializer";
import {
  type CaptureOutput,
  captureFromConfig,
} from "../captureFromConfigBase";
import type { RecordPermissionServiceArgs } from "../container/recordPermission";
import { stringifyConfig } from "../stringifyConfig";

export type CaptureRecordPermissionOutput = CaptureOutput;

export async function captureRecordPermission({
  container,
}: RecordPermissionServiceArgs): Promise<CaptureRecordPermissionOutput> {
  return captureFromConfig({
    fetchRemote: () =>
      container.recordPermissionConfigurator.getRecordPermissions(),
    serialize: ({ rights }) =>
      stringifyConfig(
        container.configCodec,
        RecordPermissionConfigSerializer.serialize({ rights }),
      ),
    getStorage: () => container.recordPermissionStorage.get(),
  });
}
