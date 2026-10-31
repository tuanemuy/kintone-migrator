import { describe, expect, it } from "vitest";
import {
  createKintoneBackedFormSchemaContainer,
  expectNoFormMutation,
  schemaFieldIn,
} from "@/core/application/__tests__/helpers";
import { ConflictError, ValidationError } from "@/core/application/error";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { isRecord } from "@/lib/typeGuards";
import { captureSchema } from "../captureSchema";
import { detectDiff } from "../detectDiff";
import { detectThreeWayDiff } from "../detectThreeWayDiff";
import { executeMigration } from "../executeMigration";
import { forceOverrideForm } from "../forceOverrideForm";
import { applyPulledMerge, pullSchema } from "../pullSchema";
import { pushSchema } from "../pushSchema";

/** `relatedApp` as written in a schema file or returned by the kintone API. */
type RawRelatedApp = Record<string, unknown>;

type LookupFieldType = "SINGLE_LINE_TEXT" | "NUMBER" | "LINK";

/**
 * The lookup field `customer_code`: its type, and where it sits (in a row, or
 * inside the subtable `items`).
 */
type LookupForm = Readonly<{
  placement: "row" | "subtable";
  fieldType: LookupFieldType;
}>;

type LocalOptions = Partial<LookupForm> & {
  readonly nameLabel?: string;
};

type RemoteOptions = LocalOptions & {
  readonly remoteLookup?: Record<string, unknown>;
};

function createContainer(
  remoteRelatedApp: RawRelatedApp,
  {
    placement = "row",
    fieldType = "SINGLE_LINE_TEXT",
    remoteLookup = {},
    nameLabel = "顧客名",
  }: RemoteOptions = {},
) {
  const fields = {
    customer_code: {
      type: fieldType,
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
      label: nameLabel,
      noLabel: false,
    },
  };
  const layoutFields = [
    { type: fieldType, code: "customer_code" },
    { type: "SINGLE_LINE_TEXT", code: "customer_name" },
  ];
  return createKintoneBackedFormSchemaContainer(
    placement === "row"
      ? { properties: fields, layout: [{ type: "ROW", fields: layoutFields }] }
      : {
          properties: {
            items: { type: "SUBTABLE", code: "items", label: "明細", fields },
          },
          layout: [{ type: "SUBTABLE", code: "items", fields: layoutFields }],
        },
  );
}

function schemaWithRelatedApp(
  relatedApp: string,
  {
    placement = "row",
    fieldType = "SINGLE_LINE_TEXT",
    nameLabel = "顧客名",
  }: LocalOptions = {},
): string {
  const container =
    placement === "row"
      ? "  - type: ROW\n"
      : "  - type: SUBTABLE\n    code: items\n    label: 明細\n";
  return `layout:
${container}    fields:
      - code: customer_code
        type: ${fieldType}
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
        label: ${nameLabel}
        noLabel: false
`;
}

function relatedAppIn(codec: ConfigCodec, schemaText: string): unknown {
  const lookup = schemaFieldIn(codec, schemaText, "customer_code")?.lookup;
  return isRecord(lookup) ? lookup.relatedApp : undefined;
}

function relatedAppOf(
  field: { readonly properties: Record<string, unknown> } | undefined,
): unknown {
  const lookup = field?.properties.lookup;
  return isRecord(lookup) ? lookup.relatedApp : undefined;
}

type Client = ReturnType<typeof createContainer>["client"];

/** The `relatedApp` of `customer_code` in the first `updateFormFields` call. */
function sentRelatedApp(client: Client): unknown {
  const params: unknown = client.app.updateFormFields.mock.calls[0]?.[0];
  if (!isRecord(params) || !isRecord(params.properties)) return undefined;
  const { customer_code, items } = params.properties;
  const field =
    customer_code ??
    (isRecord(items) && isRecord(items.fields)
      ? items.fields.customer_code
      : undefined);
  if (!isRecord(field) || !isRecord(field.lookup)) return undefined;
  return field.lookup.relatedApp;
}

const remoteRelatedApps: readonly [string, RawRelatedApp][] = [
  ["非空の code を返す API", { app: "10", code: "CUSTOMERS" }],
  ["code: '' を返す API", { app: "10", code: "" }],
];

const localRelatedApps: readonly [string, string][] = [
  ["code を省いた YAML", '{ app: "10" }'],
  ["API と同じ非空の code を書いた YAML", '{ app: "10", code: "CUSTOMERS" }'],
  ["API と違う非空の code を書いた YAML", '{ app: "10", code: "CLIENTS" }'],
  ["code: '' と書いた YAML", '{ app: "10", code: "" }'],
  ["code: に値を書かない YAML", '{ app: "10", code: }'],
  ["code を数値で書いた YAML", '{ app: "10", code: 20 }'],
];

const lookupForms: readonly LookupForm[] = (
  ["row", "subtable"] as const
).flatMap((placement) =>
  (["SINGLE_LINE_TEXT", "NUMBER", "LINK"] as const).map((fieldType) => ({
    placement,
    fieldType,
  })),
);

describe.each(
  lookupForms,
)("lookup の relatedApp（$placement に置いた $fieldType）", (form) => {
  describe("diff / migrate", () => {
    describe.each(remoteRelatedApps)("%s", (_, remote) => {
      it.each(localRelatedApps)("%s の diff は差分なし", async (_, local) => {
        const { container } = createContainer(remote, form);
        container.schemaStorage.setContent(schemaWithRelatedApp(local, form));

        const result = await detectDiff({ container });

        expect(result.entries).toEqual([]);
        expect(result.hasLayoutChanges).toBe(false);
        expect(result.isEmpty).toBe(true);
      });

      it.each(
        localRelatedApps,
      )("%s の migrate は何も送らない", async (_, local) => {
        const { container, client } = createContainer(remote, form);
        container.schemaStorage.setContent(schemaWithRelatedApp(local, form));

        await executeMigration({ container });

        expectNoFormMutation(client);
      });
    });

    it("app が違えば変更として検出し、details に code を出さない", async () => {
      const { container } = createContainer(
        { app: "11", code: "CLIENTS" },
        form,
      );
      container.schemaStorage.setContent(
        schemaWithRelatedApp('{ app: "10", code: "CUSTOMERS" }', form),
      );

      const result = await detectDiff({ container });

      expect(result.isEmpty).toBe(false);
      expect(result.entries.length).toBeGreaterThan(0);
      for (const entry of result.entries) {
        expect(entry.type).toBe("modified");
        expect(entry.details).toMatch(/"app":\s*"11"/);
        expect(entry.details).not.toContain("CLIENTS");
        expect(entry.details).not.toContain("CUSTOMERS");
      }
    });

    it("code を書いた YAML で migrate すると、relatedApp は app だけを送る", async () => {
      const { container, client } = createContainer(
        { app: "11", code: "CLIENTS" },
        form,
      );
      container.schemaStorage.setContent(
        schemaWithRelatedApp('{ app: "10", code: "CUSTOMERS" }', form),
      );

      await executeMigration({ container });

      expect(client.app.updateFormFields).toHaveBeenCalledTimes(1);
      expect(sentRelatedApp(client)).toStrictEqual({ app: "10" });
    });

    it("code を書いた YAML で override すると、relatedApp は app だけを送る", async () => {
      const { container, client } = createContainer(
        { app: "11", code: "CLIENTS" },
        form,
      );
      container.schemaStorage.setContent(
        schemaWithRelatedApp('{ app: "10", code: "CUSTOMERS" }', form),
      );

      await forceOverrideForm({ container });

      expect(client.app.updateFormFields).toHaveBeenCalledTimes(1);
      expect(sentRelatedApp(client)).toStrictEqual({ app: "10" });
    });

    it("app を書かず code だけの YAML は、migrate が検証エラーで止まり何も送らない", async () => {
      const { container, client } = createContainer(
        { app: "10", code: "CUSTOMERS" },
        form,
      );
      container.schemaStorage.setContent(
        schemaWithRelatedApp('{ code: "CUSTOMERS" }', form),
      );

      const result = executeMigration({ container });

      await expect(result).rejects.toThrow(ValidationError);
      await expect(result).rejects.toThrow("relatedApp.app");
      expectNoFormMutation(client);
    });
  });

  describe("capture / pull", () => {
    it.each(
      remoteRelatedApps,
    )("%s のとき、capture の YAML の relatedApp は app だけを持ち、直後の diff は差分なし", async (_, remote) => {
      const { container } = createContainer(remote, form);

      const { schemaText } = await captureSchema({ container });
      container.schemaStorage.setContent(schemaText);
      const result = await detectDiff({ container });

      expect(relatedAppIn(container.configCodec, schemaText)).toStrictEqual({
        app: "10",
      });
      expect(result.isEmpty).toBe(true);
    });

    it("非空の code を返す API から初回の pull が書く YAML と state の relatedApp は、app だけを持つ", async () => {
      const { container } = createContainer(
        { app: "10", code: "CUSTOMERS" },
        form,
      );

      await pullSchema({ container, input: {} });

      const local = await container.schemaStorage.get();
      const state = await container.schemaStateStorage.get();
      expect(local.exists && state.exists).toBe(true);
      if (local.exists && state.exists) {
        expect(
          relatedAppIn(container.configCodec, local.content),
        ).toStrictEqual({ app: "10" });
        expect(
          relatedAppIn(container.configCodec, state.content),
        ).toStrictEqual({ app: "10" });
      }
    });

    it.each<[string, RawRelatedApp, LocalOptions, RawRelatedApp]>([
      [
        "relatedApp.app が変わった",
        { app: "11", code: "CLIENTS" },
        {},
        { app: "11" },
      ],
      [
        "lookup の無い別のフィールドだけが変わった",
        { app: "10", code: "CUSTOMERS" },
        { nameLabel: "顧客名（変更）" },
        { app: "10" },
      ],
    ])("%s リモートを pull で取り込むと、code を書いた YAML と state の relatedApp は app だけになる", async (_, remote, options, expected) => {
      const { container } = createContainer(remote, { ...options, ...form });
      const base = schemaWithRelatedApp(
        '{ app: "10", code: "CUSTOMERS" }',
        form,
      );
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
        expect(
          relatedAppIn(container.configCodec, local.content),
        ).toStrictEqual(expected);
        expect(
          relatedAppIn(container.configCodec, state.content),
        ).toStrictEqual(expected);
      }
    });
  });

  describe("3-way diff / push", () => {
    const baseRelatedApps: readonly [string, string][] = [
      ["code を省いた base", '{ app: "10" }'],
      ["リモートと同じ code を持つ base", '{ app: "10", code: "CUSTOMERS" }'],
      ["リモートと違う code を持つ base", '{ app: "10", code: "OLD" }'],
      ["code: '' 入りの base", '{ app: "10", code: "" }'],
    ];

    describe.each(baseRelatedApps)("%s", (_, base) => {
      it.each(
        localRelatedApps,
      )("%s と、非空の code を返すリモートは差分なし", async (_, local) => {
        const { container } = createContainer(
          { app: "10", code: "CUSTOMERS" },
          form,
        );
        container.schemaStateStorage.setContent(
          schemaWithRelatedApp(base, form),
        );
        container.schemaStorage.setContent(schemaWithRelatedApp(local, form));

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
    });

    const changedKey = form.placement === "row" ? "customer_code" : "items";

    it.each<[string, string, string, RawRelatedApp, Record<string, unknown>]>([
      [
        "リモートだけ app が変わると remote drift",
        '{ app: "10", code: "CUSTOMERS" }',
        '{ app: "10", code: "CUSTOMERS" }',
        { app: "11", code: "CLIENTS" },
        { remoteDrift: [{ key: changedKey, kind: "remoteOnly" }] },
      ],
      [
        "local だけ app が変わると local change",
        '{ app: "10", code: "CUSTOMERS" }',
        '{ app: "12", code: "CUSTOMERS" }',
        { app: "10", code: "CUSTOMERS" },
        { localChanges: [{ key: changedKey, kind: "localOnly" }] },
      ],
      [
        "両側で違う app に変わると conflict",
        '{ app: "10", code: "CUSTOMERS" }',
        '{ app: "12", code: "CUSTOMERS" }',
        { app: "11", code: "CUSTOMERS" },
        { conflicts: [{ key: changedKey, kind: "conflict" }] },
      ],
    ])("%s として検出する", async (_, base, local, remote, expected) => {
      const { container } = createContainer(remote, form);
      container.schemaStateStorage.setContent(schemaWithRelatedApp(base, form));
      container.schemaStorage.setContent(schemaWithRelatedApp(local, form));

      const result = await detectThreeWayDiff({ container });

      expect(result).toMatchObject({
        mode: "three-way",
        localChanges: [],
        remoteDrift: [],
        conflicts: [],
        isEmpty: false,
        ...expected,
      });
    });

    it.each([
      ["リモートと違う code を持つ base", '{ app: "11", code: "OLD" }'],
      ["code を省いた base", '{ app: "11" }'],
    ])("%s と、非空の code を返すリモートで push すると、drift とせず app だけを送り、state にも code を書かない", async (_, base) => {
      const { container, client } = createContainer(
        { app: "11", code: "CLIENTS" },
        form,
      );
      container.schemaStateStorage.setContent(schemaWithRelatedApp(base, form));
      container.schemaStorage.setContent(
        schemaWithRelatedApp('{ app: "10", code: "CUSTOMERS" }', form),
      );

      await pushSchema({ container, input: {} });

      expect(client.app.updateFormFields).toHaveBeenCalledTimes(1);
      expect(sentRelatedApp(client)).toStrictEqual({ app: "10" });
      const state = await container.schemaStateStorage.get();
      expect(state.exists).toBe(true);
      if (state.exists) {
        expect(
          relatedAppIn(container.configCodec, state.content),
        ).toStrictEqual({ app: "10" });
      }
    });

    it("リモートの app が base から変わっていれば、push は drift として止まる", async () => {
      const { container, client } = createContainer(
        { app: "11", code: "CLIENTS" },
        form,
      );
      container.schemaStateStorage.setContent(
        schemaWithRelatedApp('{ app: "10", code: "CUSTOMERS" }', form),
      );
      container.schemaStorage.setContent(
        schemaWithRelatedApp('{ app: "12" }', form),
      );

      await expect(pushSchema({ container, input: {} })).rejects.toThrow(
        ConflictError,
      );
      expectNoFormMutation(client);
    });

    it("app を書かず code だけの YAML は、push が検証エラーで止まり何も送らない", async () => {
      const { container, client } = createContainer(
        { app: "10", code: "CUSTOMERS" },
        form,
      );
      const base = schemaWithRelatedApp('{ app: "10" }', form);
      container.schemaStateStorage.setContent(base);
      container.schemaStorage.setContent(
        schemaWithRelatedApp('{ code: "CUSTOMERS" }', form),
      );

      const result = pushSchema({ container, input: {} });

      await expect(result).rejects.toThrow(ValidationError);
      await expect(result).rejects.toThrow("relatedApp.app");
      expectNoFormMutation(client);
    });
  });
});

describe("lookup の relatedApp の diff の before / after", () => {
  it("app が違うとき、before / after の relatedApp は app だけを持つ", async () => {
    const { container } = createContainer({ app: "11", code: "CLIENTS" });
    container.schemaStorage.setContent(
      schemaWithRelatedApp('{ app: "10", code: "CUSTOMERS" }'),
    );

    const result = await detectDiff({ container });

    expect(result.entries).toHaveLength(1);
    const [entry] = result.entries;
    expect(entry).toMatchObject({
      type: "modified",
      fieldCode: "customer_code",
    });
    expect(relatedAppOf(entry?.before)).toStrictEqual({ app: "11" });
    expect(relatedAppOf(entry?.after)).toStrictEqual({ app: "10" });
    expect(entry?.details).toMatch(/^lookup: /);
    expect(entry?.details).not.toContain("CLIENTS");
    expect(entry?.details).not.toContain("CUSTOMERS");
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
    const { container } = createContainer(
      { app: "10", code: "" },
      { remoteLookup: unsetLists },
    );
    container.schemaStorage.setContent(schemaWithLists(lists));

    const result = await detectDiff({ container });

    expect(result.isEmpty).toBe(true);
  });

  it("API が空文字を返すとき、capture の YAML は空配列を書き、直後の diff は差分なし", async () => {
    const { container } = createContainer(
      { app: "10", code: "" },
      { remoteLookup: unsetLists },
    );

    const { schemaText } = await captureSchema({ container });
    container.schemaStorage.setContent(schemaText);
    const result = await detectDiff({ container });

    const lookup = schemaFieldIn(
      container.configCodec,
      schemaText,
      "customer_code",
    )?.lookup;
    expect(isRecord(lookup) && lookup.fieldMappings).toStrictEqual([]);
    expect(isRecord(lookup) && lookup.lookupPickerFields).toStrictEqual([]);
    expect(result.isEmpty).toBe(true);
  });
});
