import { stripVTControlCharacters } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TestNotificationContainer } from "@/core/application/__tests__/helpers/notification";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  note: vi.fn(),
}));

vi.mock("@/cli/notificationConfig", () => ({
  notificationArgs: {},
  resolveNotificationContainerConfig: vi.fn(() => ({})),
  resolveNotificationAppContainerConfig: vi.fn(),
}));

vi.mock("@/cli/projectConfig", () => ({
  routeMultiApp: vi.fn(
    async (
      _values: unknown,
      handlers: { singleLegacy: () => Promise<void> },
    ) => {
      await handlers.singleLegacy();
    },
  ),
  runMultiAppWithFailCheck: vi.fn(),
}));

const containerRef: { current?: TestNotificationContainer } = {};
vi.mock("@/core/application/container/notificationCli", () => ({
  createNotificationCliContainer: vi.fn(() => containerRef.current),
}));

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { createTestNotificationContainer } from "@/core/application/__tests__/helpers/notification";
import type {
  GeneralNotification,
  NotificationConfig,
  PerRecordNotification,
} from "@/core/domain/notification/entity";
import { NotificationConfigSerializer } from "@/core/domain/notification/services/configSerializer";
import { NotificationStateSerializer } from "@/core/domain/notification/services/notificationStateSerializer";
import command from "../diff";

afterEach(() => {
  vi.clearAllMocks();
});

const general = (recordEdited: boolean): GeneralNotification => ({
  entity: { type: "USER", code: "u1" },
  recordAdded: true,
  recordEdited,
  commentAdded: false,
  statusChanged: false,
  fileImported: false,
});

const perRecord = (
  filterCond: string,
  title: string,
  code = "bob",
): PerRecordNotification => ({
  filterCond,
  title,
  targets: [{ entity: { type: "USER", code } }],
});

function config(
  generalNotification: GeneralNotification,
  perRecordNotifications: PerRecordNotification[],
): NotificationConfig {
  return {
    general: { notifyToCommenter: false, notifications: [generalNotification] },
    perRecord: perRecordNotifications,
    reminder: { timezone: "Asia/Tokyo", notifications: [] },
  };
}

function setUp(
  base: NotificationConfig,
  local: NotificationConfig,
  remote: NotificationConfig,
): void {
  const container = createTestNotificationContainer();
  container.notificationStateStorage.setContent(
    configCodec.stringify(
      NotificationStateSerializer.serialize({ config: base }),
    ),
  );
  container.appRevisionStorage.setContent(
    configCodec.stringify({ revision: "1" }),
  );
  container.notificationStorage.setContent(
    configCodec.stringify(NotificationConfigSerializer.serialize(local)),
  );
  container.notificationConfigurator.setGeneralNotifications({
    notifyToCommenter: false,
    notifications: remote.general?.notifications ?? [],
    revision: "1",
  });
  container.notificationConfigurator.setPerRecordNotifications({
    notifications: remote.perRecord ?? [],
    revision: "1",
  });
  container.notificationConfigurator.setReminderNotifications({
    timezone: "Asia/Tokyo",
    notifications: [],
    revision: "1",
  });
  containerRef.current = container;
}

function noteLines(): string[] {
  const body = vi.mocked(p.note).mock.calls[0]?.[0] ?? "";
  return stripVTControlCharacters(body).split("\n");
}

describe("notification diff command (3-way)", () => {
  it("shows a perRecord key on one line with its filterCond quoted; a general key as it is", async () => {
    const base = config(general(false), [
      perRecord("a ]: b\nc", ""),
      perRecord("", "承認"),
    ]);
    setUp(
      base,
      config(general(true), [
        perRecord("a ]: b\nc", "", "carol"),
        perRecord("", "承認"),
      ]),
      config(general(false), [
        perRecord("a ]: b\nc", ""),
        perRecord("", "承認", "dave"),
      ]),
    );

    await command.run({ values: {} } as never);

    expect(handleCliError).not.toHaveBeenCalled();
    expect(noteLines()).toEqual([
      "L [general:USER:u1] USER:u1: local change",
      'L [perRecord:"a ]: b\\nc"#0] "a ]: b\\nc": local change',
      'R [perRecord:""#0] 承認: remote drift',
    ]);
  });
});
