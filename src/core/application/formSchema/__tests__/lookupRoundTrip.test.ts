import { describe, expect, it } from "vitest";
import { createKintoneBackedFormSchemaContainer } from "@/core/application/__tests__/helpers";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { isRecord } from "@/lib/typeGuards";
import { captureSchema } from "../captureSchema";
import { detectDiff } from "../detectDiff";
import { detectThreeWayDiff } from "../detectThreeWayDiff";
import { executeMigration } from "../executeMigration";
import { applyPulledMerge, pullSchema } from "../pullSchema";

type RelatedApp = { app: string; code?: string };

function createContainer(
  remoteRelatedApp: RelatedApp,
  remoteLookup: Record<string, unknown> = {},
) {
  return createKintoneBackedFormSchemaContainer({
    properties: {
      customer_code: {
        type: "SINGLE_LINE_TEXT",
        code: "customer_code",
        label: "顧客コード",
        noLabel: false,
        required: false,
        lookup: {
          relatedApp: remoteRelatedApp,
          relatedKeyField: "code",
          fieldMappings: [{ field: "customer_name", relatedField: "name" }],
          lookupPickerFields: ["code", "name"],
          filterCond: "",
          sort: "レコード番号 desc",
          ...remoteLookup,
        },
      },
      customer_name: {
        type: "SINGLE_LINE_TEXT",
        code: "customer_name",
        label: "顧客名",
        noLabel: false,
      },
    },
    layout: [
      {
        type: "ROW",
        fields: [
          { type: "SINGLE_LINE_TEXT", code: "customer_code" },
          { type: "SINGLE_LINE_TEXT", code: "customer_name" },
        ],
      },
    ],
  });
}

function schemaWithRelatedApp(relatedApp: string): string {
  return `layout:
  - type: ROW
    fields:
      - code: customer_code
        type: SINGLE_LINE_TEXT
        label: 顧客コード
        noLabel: false
        required: false
        lookup:
          relatedApp: ${relatedApp}
          relatedKeyField: code
          fieldMappings:
            - field: customer_name
              relatedField: name
          lookupPickerFields:
            - code
            - name
          filterCond: ""
          sort: レコード番号 desc
      - code: customer_name
        type: SINGLE_LINE_TEXT
        label: 顧客名
        noLabel: false
`;
}

function relatedAppIn(codec: ConfigCodec, schemaText: string): unknown {
  const parsed = codec.parse(schemaText) as {
    layout: { fields: { code: string; lookup?: { relatedApp: unknown } }[] }[];
  };
  return parsed.layout[0]?.fields.find((f) => f.code === "customer_code")
    ?.lookup?.relatedApp;
}

function relatedAppOf(
  field: { readonly properties: Record<string, unknown> } | undefined,
): unknown {
  const lookup = field?.properties.lookup;
  return isRecord(lookup) ? lookup.relatedApp : undefined;
}

type Client = ReturnType<typeof createContainer>["client"];

function expectNoMutation(client: Client) {
  expect(client.app.addFormFields).not.toHaveBeenCalled();
  expect(client.app.updateFormFields).not.toHaveBeenCalled();
  expect(client.app.deleteFormFields).not.toHaveBeenCalled();
  expect(client.app.updateFormLayout).not.toHaveBeenCalled();
}

function sentRelatedApp(client: Client): unknown {
  const params: unknown = client.app.updateFormFields.mock.calls[0]?.[0];
  if (!isRecord(params) || !isRecord(params.properties)) return undefined;
  const field = params.properties.customer_code;
  return isRecord(field) ? relatedAppOf({ properties: field }) : undefined;
}

describe("lookup の relatedApp を含むフォームの diff / migrate", () => {
  describe.each([
    ["code を省いた YAML", '{ app: "10" }'],
    [
      "code: '' と書いた YAML（旧版 capture の出力）",
      '{ app: "10", code: "" }',
    ],
    ["code: に値を書かない YAML", '{ app: "10", code: }'],
  ])("%s と、code: '' を返す API", (_, relatedApp) => {
    it("diff は差分なし", async () => {
      const { container } = createContainer({ app: "10", code: "" });
      container.schemaStorage.setContent(schemaWithRelatedApp(relatedApp));

      const result = await detectDiff({ container });

      expect(result.entries).toEqual([]);
      expect(result.hasLayoutChanges).toBe(false);
      expect(result.isEmpty).toBe(true);
    });

    it("migrate は何も送らない", async () => {
      const { container, client } = createContainer({ app: "10", code: "" });
      container.schemaStorage.setContent(schemaWithRelatedApp(relatedApp));

      await executeMigration({ container });

      expectNoMutation(client);
    });
  });

  it("YAML と API が同じ非空の code を持つとき、diff は差分なし", async () => {
    const { container } = createContainer({ app: "10", code: "CUSTOMERS" });
    container.schemaStorage.setContent(
      schemaWithRelatedApp('{ app: "10", code: "CUSTOMERS" }'),
    );

    const result = await detectDiff({ container });

    expect(result.isEmpty).toBe(true);
  });

  it.each<{
    name: string;
    remote: RelatedApp;
    local: string;
    before: RelatedApp;
    after: RelatedApp;
  }>([
    {
      name: "app が違う",
      remote: { app: "11", code: "" },
      local: '{ app: "10" }',
      before: { app: "11" },
      after: { app: "10" },
    },
    {
      name: "YAML だけが非空の code を持つ",
      remote: { app: "10", code: "" },
      local: '{ app: "10", code: "CUSTOMERS" }',
      before: { app: "10" },
      after: { app: "10", code: "CUSTOMERS" },
    },
    {
      name: "非空の code が違う",
      remote: { app: "10", code: "CLIENTS" },
      local: '{ app: "10", code: "CUSTOMERS" }',
      before: { app: "10", code: "CLIENTS" },
      after: { app: "10", code: "CUSTOMERS" },
    },
  ])("$name とき、lookup の変更として検出する", async ({
    remote,
    local,
    before,
    after,
  }) => {
    const { container } = createContainer(remote);
    container.schemaStorage.setContent(schemaWithRelatedApp(local));

    const result = await detectDiff({ container });

    expect(result.isEmpty).toBe(false);
    expect(result.entries).toHaveLength(1);
    const [entry] = result.entries;
    expect(relatedAppOf(entry?.before)).toStrictEqual(before);
    expect(relatedAppOf(entry?.after)).toStrictEqual(after);
    expect(entry).toMatchObject({
      type: "modified",
      fieldCode: "customer_code",
    });
    expect(entry?.details).toMatch(/^lookup: /);
  });

  it.each<[string, string, RelatedApp]>([
    ["code: '' の YAML", '{ app: "10", code: "" }', { app: "10" }],
    ["code: に値を書かない YAML", '{ app: "10", code: }', { app: "10" }],
    [
      "非空の code の YAML",
      '{ app: "10", code: "CUSTOMERS" }',
      { app: "10", code: "CUSTOMERS" },
    ],
  ])("%s で migrate すると、空でない code だけを送る", async (_, local, sent) => {
    const { container, client } = createContainer({ app: "11", code: "" });
    container.schemaStorage.setContent(schemaWithRelatedApp(local));

    await executeMigration({ container });

    expect(client.app.updateFormFields).toHaveBeenCalledTimes(1);
    expect(sentRelatedApp(client)).toStrictEqual(sent);
  });
});

describe("未設定の fieldMappings と lookupPickerFields", () => {
  const unsetLists = { fieldMappings: "", lookupPickerFields: "" };
  const schemaWithLists = (lists: string) => `layout:
  - type: ROW
    fields:
      - code: customer_code
        type: SINGLE_LINE_TEXT
        label: 顧客コード
        noLabel: false
        required: false
        lookup:
          relatedApp: { app: "10" }
          relatedKeyField: code
${lists}
          filterCond: ""
          sort: レコード番号 desc
      - code: customer_name
        type: SINGLE_LINE_TEXT
        label: 顧客名
        noLabel: false
`;

  it.each([
    [
      "空文字を書いた YAML（旧版 capture の出力）",
      '          fieldMappings: ""\n          lookupPickerFields: ""',
    ],
    ["キーを省いた YAML", ""],
    [
      "空配列を書いた YAML",
      "          fieldMappings: []\n          lookupPickerFields: []",
    ],
  ])("%s と、空文字を返す API は差分なし", async (_, lists) => {
    const { container } = createContainer({ app: "10", code: "" }, unsetLists);
    container.schemaStorage.setContent(schemaWithLists(lists));

    const result = await detectDiff({ container });

    expect(result.isEmpty).toBe(true);
  });

  it("API が空文字を返すとき、capture の YAML は空配列を書き、直後の diff は差分なし", async () => {
    const { container } = createContainer({ app: "10", code: "" }, unsetLists);

    const { schemaText } = await captureSchema({ container });
    container.schemaStorage.setContent(schemaText);
    const result = await detectDiff({ container });

    const parsed = container.configCodec.parse(schemaText) as {
      layout: { fields: { lookup?: Record<string, unknown> }[] }[];
    };
    const lookup = parsed.layout[0]?.fields[0]?.lookup;
    expect(lookup?.fieldMappings).toStrictEqual([]);
    expect(lookup?.lookupPickerFields).toStrictEqual([]);
    expect(result.isEmpty).toBe(true);
  });
});

describe("lookup の relatedApp を含むフォームの capture / pull", () => {
  it("API が code: '' を返すとき、capture の YAML の relatedApp は code を持たず、直後の diff は差分なし", async () => {
    const { container } = createContainer({ app: "10", code: "" });

    const { schemaText } = await captureSchema({ container });
    container.schemaStorage.setContent(schemaText);
    const result = await detectDiff({ container });

    expect(relatedAppIn(container.configCodec, schemaText)).toStrictEqual({
      app: "10",
    });
    expect(result.isEmpty).toBe(true);
  });

  it("API が非空の code を返すとき、capture の YAML の relatedApp は code を保つ", async () => {
    const { container } = createContainer({ app: "10", code: "CUSTOMERS" });

    const { schemaText } = await captureSchema({ container });

    expect(relatedAppIn(container.configCodec, schemaText)).toStrictEqual({
      app: "10",
      code: "CUSTOMERS",
    });
  });

  it("初回の pull が書く YAML と state の relatedApp は、API の code: '' を持たない", async () => {
    const { container } = createContainer({ app: "10", code: "" });

    await pullSchema({ container, input: {} });

    const local = await container.schemaStorage.get();
    const state = await container.schemaStateStorage.get();
    expect(local.exists && state.exists).toBe(true);
    if (local.exists && state.exists) {
      expect(relatedAppIn(container.configCodec, local.content)).toStrictEqual({
        app: "10",
      });
      expect(relatedAppIn(container.configCodec, state.content)).toStrictEqual({
        app: "10",
      });
    }
  });

  it("リモートの変更を取り込む pull が書く YAML と state の relatedApp は、API の code: '' を持たない", async () => {
    const { container } = createContainer({ app: "11", code: "" });
    const base = schemaWithRelatedApp('{ app: "10", code: "" }');
    container.schemaStateStorage.setContent(base);
    container.schemaStorage.setContent(base);

    const result = await pullSchema({ container, input: {} });
    expect(result.mode).toBe("merged");
    if (result.mode !== "merged") return;
    await applyPulledMerge({
      container,
      input: {
        merge: result.merge,
        resolution: { fields: new Map(), layout: "noConflict" },
        remoteRevision: result.remoteRevision,
        remoteSchema: result.remoteSchema,
      },
    });

    const local = await container.schemaStorage.get();
    const state = await container.schemaStateStorage.get();
    expect(local.exists && state.exists).toBe(true);
    if (local.exists && state.exists) {
      expect(relatedAppIn(container.configCodec, local.content)).toStrictEqual({
        app: "11",
      });
      expect(relatedAppIn(container.configCodec, state.content)).toStrictEqual({
        app: "11",
      });
    }
  });
});

describe("lookup の relatedApp を含むフォームの 3-way diff", () => {
  it.each([
    ["code を省いた base", '{ app: "10" }'],
    ["旧版が書いた code: '' 入りの base", '{ app: "10", code: "" }'],
  ])("%s、code を省いた local、code: '' を返すリモートは差分なし", async (_, base) => {
    const { container } = createContainer({ app: "10", code: "" });
    container.schemaStateStorage.setContent(schemaWithRelatedApp(base));
    container.schemaStorage.setContent(schemaWithRelatedApp('{ app: "10" }'));

    const result = await detectThreeWayDiff({ container });

    expect(result).toEqual({
      mode: "three-way",
      localChanges: [],
      remoteDrift: [],
      conflicts: [],
      extras: [],
      isEmpty: true,
    });
  });

  it("リモートだけ relatedApp.app が変わると remote drift として検出する", async () => {
    const { container } = createContainer({ app: "11", code: "" });
    const base = schemaWithRelatedApp('{ app: "10" }');
    container.schemaStateStorage.setContent(base);
    container.schemaStorage.setContent(base);

    const result = await detectThreeWayDiff({ container });

    expect(result).toMatchObject({
      mode: "three-way",
      localChanges: [],
      remoteDrift: [{ key: "customer_code", kind: "remoteOnly" }],
      conflicts: [],
      isEmpty: false,
    });
  });
});
