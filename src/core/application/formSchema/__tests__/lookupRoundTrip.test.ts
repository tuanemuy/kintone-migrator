import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { describe, expect, it, vi } from "vitest";
import { KintoneFormConfigurator } from "@/core/adapters/kintone/formConfigurator";
import {
  createTestFormSchemaContainer,
  type TestFormSchemaContainer,
} from "@/core/application/__tests__/helpers";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { isRecord } from "@/lib/typeGuards";
import { captureSchema } from "../captureSchema";
import { detectDiff } from "../detectDiff";
import { detectThreeWayDiff } from "../detectThreeWayDiff";
import { executeMigration } from "../executeMigration";
import { pullSchema } from "../pullSchema";

type RelatedApp = { app: string; code?: string };

function createKintoneClient(relatedApp: RelatedApp) {
  const mutation = () => Promise.resolve({ revision: "4" });
  return {
    app: {
      getFormFields: () =>
        Promise.resolve({
          revision: "3",
          properties: {
            customer_code: {
              type: "SINGLE_LINE_TEXT",
              code: "customer_code",
              label: "顧客コード",
              noLabel: false,
              required: false,
              lookup: {
                relatedApp,
                relatedKeyField: "code",
                fieldMappings: [
                  { field: "customer_name", relatedField: "name" },
                ],
                lookupPickerFields: ["code", "name"],
                filterCond: "",
                sort: "レコード番号 desc",
              },
            },
            customer_name: {
              type: "SINGLE_LINE_TEXT",
              code: "customer_name",
              label: "顧客名",
              noLabel: false,
            },
          },
        }),
      getFormLayout: () =>
        Promise.resolve({
          revision: "3",
          layout: [
            {
              type: "ROW",
              fields: [
                { type: "SINGLE_LINE_TEXT", code: "customer_code" },
                { type: "SINGLE_LINE_TEXT", code: "customer_name" },
              ],
            },
          ],
        }),
      addFormFields: vi.fn(mutation),
      updateFormFields: vi.fn(mutation),
      deleteFormFields: vi.fn(mutation),
      updateFormLayout: vi.fn(mutation),
    },
  };
}

function createContainer(remoteRelatedApp: RelatedApp) {
  const client = createKintoneClient(remoteRelatedApp);
  const container: Omit<TestFormSchemaContainer, "formConfigurator"> & {
    formConfigurator: KintoneFormConfigurator;
  } = {
    ...createTestFormSchemaContainer(),
    formConfigurator: new KintoneFormConfigurator(
      client as unknown as KintoneRestAPIClient,
      "1",
    ),
  };
  return { container, client };
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

function expectNoMutation(client: ReturnType<typeof createKintoneClient>) {
  expect(client.app.addFormFields).not.toHaveBeenCalled();
  expect(client.app.updateFormFields).not.toHaveBeenCalled();
  expect(client.app.deleteFormFields).not.toHaveBeenCalled();
  expect(client.app.updateFormLayout).not.toHaveBeenCalled();
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

  it("API が code: '' を返すとき、pull が書く YAML と state の relatedApp は code を持たない", async () => {
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

  it("API が非空の code を返すとき、capture の YAML の relatedApp は code を保つ", async () => {
    const { container } = createContainer({ app: "10", code: "CUSTOMERS" });

    const { schemaText } = await captureSchema({ container });

    expect(relatedAppIn(container.configCodec, schemaText)).toStrictEqual({
      app: "10",
      code: "CUSTOMERS",
    });
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
