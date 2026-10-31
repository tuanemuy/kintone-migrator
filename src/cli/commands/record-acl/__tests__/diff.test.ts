import { stripVTControlCharacters } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TestRecordPermissionContainer } from "@/core/application/__tests__/helpers/recordPermission";

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

vi.mock("@/cli/recordAclConfig", () => ({
  recordAclArgs: {},
  resolveRecordAclContainerConfig: vi.fn(() => ({})),
  resolveRecordAclAppContainerConfig: vi.fn(),
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

const containerRef: { current?: TestRecordPermissionContainer } = {};
vi.mock("@/core/application/container/recordPermissionCli", () => ({
  createRecordPermissionCliContainer: vi.fn(() => containerRef.current),
}));

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { createTestRecordPermissionContainer } from "@/core/application/__tests__/helpers/recordPermission";
import type {
  RecordPermissionConfig,
  RecordRight,
} from "@/core/domain/recordPermission/entity";
import { RecordPermissionConfigSerializer } from "@/core/domain/recordPermission/services/configSerializer";
import { RecordPermissionStateSerializer } from "@/core/domain/recordPermission/services/recordPermissionStateSerializer";
import command from "../diff";

afterEach(() => {
  vi.clearAllMocks();
});

function right(filterCond: string, viewable: boolean): RecordRight {
  return {
    filterCond,
    entities: [
      {
        entity: { type: "USER", code: "u1" },
        viewable,
        editable: false,
        deletable: false,
        includeSubs: false,
      },
    ],
  };
}

function setUp(
  base: RecordPermissionConfig,
  local: RecordPermissionConfig,
  remote: RecordPermissionConfig,
): void {
  const container = createTestRecordPermissionContainer();
  container.recordPermissionStateStorage.setContent(
    configCodec.stringify(
      RecordPermissionStateSerializer.serialize({ config: base }),
    ),
  );
  container.appRevisionStorage.setContent(
    configCodec.stringify({ revision: "1" }),
  );
  container.recordPermissionStorage.setContent(
    configCodec.stringify(RecordPermissionConfigSerializer.serialize(local)),
  );
  container.recordPermissionConfigurator.setPermissions({
    rights: remote.rights,
    revision: "2",
  });
  containerRef.current = container;
}

function noteLines(): string[] {
  const body = vi.mocked(p.note).mock.calls[0]?.[0] ?? "";
  return stripVTControlCharacters(body).split("\n");
}

describe("record-acl diff command (3-way)", () => {
  it("shows each key on one line with its filterCond quoted and the index after it", async () => {
    const filterCond = 'a ]: "b"#1\nc';
    setUp(
      {
        rights: [
          right(filterCond, true),
          right(filterCond, true),
          right("", true),
        ],
      },
      {
        rights: [
          right(filterCond, false),
          right(filterCond, true),
          right("", true),
        ],
      },
      {
        rights: [
          right(filterCond, true),
          right(filterCond, false),
          right("", false),
        ],
      },
    );

    await command.run({ values: {} } as never);

    expect(handleCliError).not.toHaveBeenCalled();
    expect(noteLines()).toEqual([
      'L ["a ]: \\"b\\"#1\\nc"#0] "a ]: \\"b\\"#1\\nc": local change',
      'R ["a ]: \\"b\\"#1\\nc"#1] "a ]: \\"b\\"#1\\nc": remote drift',
      'R [""#0] (all records): remote drift',
    ]);
  });
});
