import type { NotificationServiceArgs } from "../container/notification";

export type SaveNotificationInput = {
  readonly configText: string;
};

export async function saveNotification({
  container,
  input,
}: NotificationServiceArgs<SaveNotificationInput>): Promise<void> {
  await container.notificationStorage.update(input.configText);
}
