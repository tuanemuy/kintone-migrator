import { NotificationConfigSerializer } from "@/core/domain/notification/services/configSerializer";
import type { NotificationServiceArgs } from "../container/notification";
import { stringifyConfig } from "../stringifyConfig";
import { loadNotificationRemote } from "./loadNotificationRemote";

export type CaptureNotificationOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};

export async function captureNotification({
  container,
}: NotificationServiceArgs): Promise<CaptureNotificationOutput> {
  const { config } = await loadNotificationRemote(container);

  const configText = stringifyConfig(
    container.configCodec,
    NotificationConfigSerializer.serialize(config),
  );
  const existing = await container.notificationStorage.get();

  return {
    configText,
    hasExistingConfig: existing.exists,
  };
}
