import { describe, expect, it } from "vitest";
import {
  createKintoneBackedFormSchemaContainer,
  expectNoFormMutation,
  schemaFieldIn,
} from "@/core/application/__tests__/helpers";
import { ConflictError, ValidationError } from "@/core/application/error";
import type { FieldCode } from "@/core/domain/formSchema/valueObject";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { isRecord } from "@/lib/typeGuards";
import { captureSchema } from "../captureSchema";
import { detectDiff } from "../detectDiff";
import { detectThreeWayDiff } from "../detectThreeWayDiff";
import { executeMigration } from "../executeMigration";
import { forceOverrideForm } from "../forceOverrideForm";
import { loadThreeWayInputs } from "../loadThreeWayInputs";
import { applyPulledMerge, pullSchema } from "../pullSchema";
import { pushSchema } from "../pushSchema";

/** `relatedApp` as returned by the kintone API. */
type RawRelatedApp = Record<string, unknown>;

type FormOptions = Readonly<{
  /** Label of the field next to the one holding `relatedApp`. */
  otherLabel?: string;
}>;

type KintoneForm = Readonly<{
  properties: Record<string, unknown>;
  layout: readonly unknown[];
}>;

/** Where the field holding `relatedApp` sits, and what kind of field it is. */
type Placement = Readonly<{
  name: string;
  /** Code of the field holding `relatedApp`. */
  fieldCode: string;
  /** Key under which a 3-way diff reports a change of that field. */
  changedKey: string;
  form: (relatedApp: RawRelatedApp, options?: FormOptions) => KintoneForm;
  schema: (relatedApp: string, options?: FormOptions) => string;
  /** The `relatedApp` of a field as kintone or a schema file holds it. */
  relatedAppOf: (field: Record<string, unknown>) => unknown;
}>;

type LookupFieldType = "SINGLE_LINE_TEXT" | "NUMBER" | "LINK";

function lookupPlacement(
  container: "row" | "subtable",
  fieldType: LookupFieldType,
): Placement {
  const fields = (relatedApp: RawRelatedApp, otherLabel: string) => ({
    customer_code: {
      type: fieldType,
      code: "customer_code",
      label: "顧客コード",
      noLabel: false,
      required: false,
      lookup: {
        relatedApp,
        relatedKeyField: "code",
        fieldMappings: [{ field: "customer_name", relatedField: "name" }],
        lookupPickerFields: ["code", "name"],
        filterCond: "",
        sort: "レコード番号 desc",
      },
    },
    customer_name: {
      type: "SINGLE_LINE_TEXT",
      code: "customer_name",
      label: otherLabel,
      noLabel: false,
    },
  });
  const layoutFields = [
    { type: fieldType, code: "customer_code" },
    { type: "SINGLE_LINE_TEXT", code: "customer_name" },
  ];
  return {
    name: `${container === "row" ? "行" : "サブテーブル"}の ${fieldType} の lookup`,
    fieldCode: "customer_code",
    changedKey: container === "row" ? "customer_code" : "items",
    form: (relatedApp, { otherLabel = "顧客名" } = {}) =>
      container === "row"
        ? {
            properties: fields(relatedApp, otherLabel),
            layout: [{ type: "ROW", fields: layoutFields }],
          }
        : {
            properties: {
              items: {
                type: "SUBTABLE",
                code: "items",
                label: "明細",
                fields: fields(relatedApp, otherLabel),
              },
            },
            layout: [{ type: "SUBTABLE", code: "items", fields: layoutFields }],
          },
    schema: (relatedApp, { otherLabel = "顧客名" } = {}) => `layout:
${container === "row" ? "  - type: ROW\n" : "  - type: SUBTABLE\n    code: items\n    label: 明細\n"}    fields:
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
        label: ${otherLabel === "" ? '""' : otherLabel}
        noLabel: false
`,
    relatedAppOf: (field) =>
      isRecord(field.lookup) ? field.lookup.relatedApp : undefined,
  };
}

const referenceTablePlacement: Placement = {
  name: "REFERENCE_TABLE",
  fieldCode: "members",
  changedKey: "members",
  form: (relatedApp, { otherLabel = "企業名" } = {}) => ({
    properties: {
      company: {
        type: "SINGLE_LINE_TEXT",
        code: "company",
        label: otherLabel,
        noLabel: false,
      },
      members: {
        type: "REFERENCE_TABLE",
        code: "members",
        label: "関連担当者情報",
        noLabel: false,
        referenceTable: {
          relatedApp,
          condition: { field: "company", relatedField: "company_name" },
          filterCond: "",
          displayFields: ["member_name", "email"],
          sort: "レコード番号 desc",
          size: "5",
        },
      },
    },
    layout: [
      {
        type: "ROW",
        fields: [
          { type: "SINGLE_LINE_TEXT", code: "company" },
          { type: "REFERENCE_TABLE", code: "members" },
        ],
      },
    ],
  }),
  schema: (relatedApp, { otherLabel = "企業名" } = {}) => `layout:
  - type: ROW
    fields:
      - code: company
        type: SINGLE_LINE_TEXT
        label: ${otherLabel === "" ? '""' : otherLabel}
        noLabel: false
      - code: members
        type: REFERENCE_TABLE
        label: 関連担当者情報
        noLabel: false
        referenceTable:
          relatedApp: ${relatedApp}
          condition:
            field: company
            relatedField: company_name
          filterCond: ""
          displayFields:
            - member_name
            - email
          sort: レコード番号 desc
          size: "5"
`,
  relatedAppOf: (field) =>
    isRecord(field.referenceTable)
      ? field.referenceTable.relatedApp
      : undefined,
};

const placements: readonly Placement[] = [
  ...(["row", "subtable"] as const).flatMap((container) =>
    (["SINGLE_LINE_TEXT", "NUMBER", "LINK"] as const).map((fieldType) =>
      lookupPlacement(container, fieldType),
    ),
  ),
  referenceTablePlacement,
];

const BY_ID = '{ app: "10" }';
const BY_CODE = '{ code: "CUSTOMERS" }';
const SAME_APP = { app: "10", code: "CUSTOMERS" };
const SAME_APP_WITHOUT_CODE = { app: "10", code: "" };
const OTHER_APP = { app: "11", code: "CLIENTS" };

type Client = ReturnType<
  typeof createKintoneBackedFormSchemaContainer
>["client"];

describe.each(placements)("$name の relatedApp", (placement) => {
  function createContainer(
    relatedApp: RawRelatedApp,
    options: FormOptions = {},
  ) {
    return createKintoneBackedFormSchemaContainer(
      placement.form(relatedApp, options),
    );
  }

  /** A container whose form has no fields, so a migrate adds every field. */
  function createEmptyContainer() {
    return createKintoneBackedFormSchemaContainer({
      properties: {},
      layout: [],
    });
  }

  function relatedAppIn(codec: ConfigCodec, schemaText: string): unknown {
    const field = schemaFieldIn(codec, schemaText, placement.fieldCode);
    return field === undefined ? undefined : placement.relatedAppOf(field);
  }

  async function storedRelatedApps(
    container: ReturnType<typeof createContainer>["container"],
  ): Promise<{ local: unknown; state: unknown }> {
    const local = await container.schemaStorage.get();
    const state = await container.schemaStateStorage.get();
    return {
      local: local.exists
        ? relatedAppIn(container.configCodec, local.content)
        : undefined,
      state: state.exists
        ? relatedAppIn(container.configCodec, state.content)
        : undefined,
    };
  }

  /** The `relatedApp` of the field in the first call of a form mutation. */
  function sentRelatedApp(
    client: Client,
    method: "addFormFields" | "updateFormFields",
  ): unknown {
    const params: unknown = client.app[method].mock.calls[0]?.[0];
    if (!isRecord(params) || !isRecord(params.properties)) return undefined;
    const { items } = params.properties;
    const field =
      params.properties[placement.fieldCode] ??
      (isRecord(items) && isRecord(items.fields)
        ? items.fields[placement.fieldCode]
        : undefined);
    return isRecord(field) ? placement.relatedAppOf(field) : undefined;
  }

  describe("diff / migrate", () => {
    it.each<[string, string, RawRelatedApp]>([
      ["ID で指定した YAML", BY_ID, SAME_APP],
      ["ID で指定した YAML", BY_ID, SAME_APP_WITHOUT_CODE],
      [
        "code: に値を書かず ID で指定した YAML",
        '{ app: "10", code: }',
        SAME_APP,
      ],
      ["コードで指定した YAML", BY_CODE, SAME_APP],
    ])("%s と、同じアプリを %o で返すリモートは差分なしで、migrate は何も送らない", async (_, local, remote) => {
      const { container, client } = createContainer(remote);
      container.schemaStorage.setContent(placement.schema(local));

      const result = await detectDiff({ container });
      await executeMigration({ container });

      expect(result.entries).toEqual([]);
      expect(result.hasLayoutChanges).toBe(false);
      expect(result.isEmpty).toBe(true);
      expectNoFormMutation(client);
    });

    it("コードで指定した YAML と、別のアプリコードを返すリモートは、relatedApp の差分になる", async () => {
      const { container } = createContainer(OTHER_APP);
      container.schemaStorage.setContent(placement.schema(BY_CODE));

      const result = await detectDiff({ container });

      expect(result.isEmpty).toBe(false);
      expect(result.entries.length).toBeGreaterThan(0);
      for (const entry of result.entries) {
        expect(entry.type).toBe("modified");
        expect(entry.details).toMatch(/"code":\s*"CLIENTS"/);
        expect(entry.details).toMatch(/"code":\s*"CUSTOMERS"/);
        expect(entry.details).not.toMatch(/"app":/);
      }
    });

    it("コードで指定した YAML と、アプリコードの無いリモートは、ID 指定からコード指定への差分になる", async () => {
      const { container } = createContainer(SAME_APP_WITHOUT_CODE);
      container.schemaStorage.setContent(placement.schema(BY_CODE));

      const result = await detectDiff({ container });

      expect(result.isEmpty).toBe(false);
      expect(result.entries.length).toBeGreaterThan(0);
      for (const entry of result.entries) {
        expect(entry.type).toBe("modified");
        expect(entry.details).toMatch(
          /\{\s*"app":\s*"10"\s*\}[\s\S]*->[\s\S]*\{\s*"code":\s*"CUSTOMERS"\s*\}/,
        );
      }
    });

    it.each<[string, string, RawRelatedApp]>([
      ["コード指定", BY_CODE, { code: "CUSTOMERS" }],
      ["ID 指定", BY_ID, { app: "10" }],
    ])("%s の YAML で migrate すると、更新はその指定だけを送る", async (_, local, expected) => {
      const { container, client } = createContainer(OTHER_APP);
      container.schemaStorage.setContent(placement.schema(local));

      await executeMigration({ container });

      expect(client.app.updateFormFields).toHaveBeenCalledTimes(1);
      expect(sentRelatedApp(client, "updateFormFields")).toStrictEqual(
        expected,
      );
    });

    it.each<[string, string, RawRelatedApp]>([
      ["コード指定", BY_CODE, { code: "CUSTOMERS" }],
      ["ID 指定", BY_ID, { app: "10" }],
    ])("%s の YAML で migrate すると、追加はその指定だけを送る", async (_, local, expected) => {
      const { container, client } = createEmptyContainer();
      container.schemaStorage.setContent(placement.schema(local));

      await executeMigration({ container });

      expect(client.app.addFormFields).toHaveBeenCalledTimes(1);
      expect(sentRelatedApp(client, "addFormFields")).toStrictEqual(expected);
    });

    it.each<[string, string, RawRelatedApp]>([
      ["コード指定", BY_CODE, { code: "CUSTOMERS" }],
      ["ID 指定", BY_ID, { app: "10" }],
    ])("%s の YAML で override すると、その指定だけを送る", async (_, local, expected) => {
      const { container, client } = createContainer(OTHER_APP);
      container.schemaStorage.setContent(placement.schema(local));

      await forceOverrideForm({ container });

      expect(client.app.updateFormFields).toHaveBeenCalledTimes(1);
      expect(sentRelatedApp(client, "updateFormFields")).toStrictEqual(
        expected,
      );
    });

    it.each([
      [
        "app と code の両方を書いた",
        '{ app: "10", code: "CUSTOMERS" }',
        "only one of",
      ],
      ["app も code も書かない", "{}", '.app" or "'],
      ["app と code の両方に値を書かない", "{ app: , code: }", '.app" or "'],
      ["空の code だけを書いた", '{ code: "" }', "relatedApp.code"],
      ["空の app だけを書いた", '{ app: "" }', "relatedApp.app"],
    ])("%s YAML は、migrate が検証エラーで止まり何も送らない", async (_, local, message) => {
      const { container, client } = createContainer(SAME_APP);
      container.schemaStorage.setContent(placement.schema(local));

      const result = executeMigration({ container });

      await expect(result).rejects.toThrow(ValidationError);
      await expect(result).rejects.toThrow(message);
      expectNoFormMutation(client);
    });
  });

  describe("capture", () => {
    it.each<[string, RawRelatedApp]>([
      ["アプリコードを返す", SAME_APP],
      ["code: '' を返す", SAME_APP_WITHOUT_CODE],
      ["code を返さない", { app: "10" }],
    ])("既存のスキーマが無く、リモートが%sとき、ID 指定で書き出し、直後の diff は差分なし", async (_, remote) => {
      const { container } = createContainer(remote);

      const { schemaText } = await captureSchema({ container });
      container.schemaStorage.setContent(schemaText);
      const result = await detectDiff({ container });

      expect(relatedAppIn(container.configCodec, schemaText)).toStrictEqual({
        app: "10",
      });
      expect(result.isEmpty).toBe(true);
    });

    it.each<[string, string, FormOptions]>([
      ["コード指定", BY_CODE, {}],
      ["validate で落ちるだけの、コード指定", BY_CODE, { otherLabel: "" }],
    ])("既存のスキーマが%sなら、リモートのアプリコードで書き出し、直後の diff は差分なし", async (_, existing, options) => {
      const { container } = createContainer(OTHER_APP);
      container.schemaStorage.setContent(placement.schema(existing, options));

      const { schemaText } = await captureSchema({ container });
      container.schemaStorage.setContent(schemaText);
      const result = await detectDiff({ container });

      expect(relatedAppIn(container.configCodec, schemaText)).toStrictEqual({
        code: "CLIENTS",
      });
      expect(result.isEmpty).toBe(true);
    });

    it("既存のスキーマがコード指定でも、リモートの参照先にアプリコードが無ければ ID 指定で書き出す", async () => {
      const { container } = createContainer(SAME_APP_WITHOUT_CODE);
      container.schemaStorage.setContent(placement.schema(BY_CODE));

      const { schemaText } = await captureSchema({ container });

      expect(relatedAppIn(container.configCodec, schemaText)).toStrictEqual({
        app: "10",
      });
    });

    it.each([
      ["YAML として読めない", "layout: [\n"],
      [
        "app と code の両方を書いた",
        placement.schema('{ app: "10", code: "CUSTOMERS" }'),
      ],
    ])("既存のスキーマが%sとき、capture は成功して ID 指定で書き出す", async (_, existing) => {
      const { container } = createContainer(SAME_APP);
      container.schemaStorage.setContent(existing);

      const { schemaText, hasExistingSchema } = await captureSchema({
        container,
      });

      expect(hasExistingSchema).toBe(true);
      expect(relatedAppIn(container.configCodec, schemaText)).toStrictEqual({
        app: "10",
      });
    });
  });

  describe("pull", () => {
    it("ローカルも state も無い初回の pull は、YAML と state を ID 指定で書く", async () => {
      const { container } = createContainer(SAME_APP);

      await pullSchema({ container, input: {} });

      expect(await storedRelatedApps(container)).toStrictEqual({
        local: { app: "10" },
        state: { app: "10" },
      });
    });

    it.each<[string, "firstTime" | "force"]>([
      ["state の無い初回の pull", "firstTime"],
      ["force の pull", "force"],
    ])("%s は、ローカルのコード指定を保って YAML と state を書く", async (_, mode) => {
      const { container } = createContainer(OTHER_APP);
      container.schemaStorage.setContent(placement.schema(BY_CODE));
      if (mode === "force") {
        container.schemaStateStorage.setContent(placement.schema(BY_CODE));
      }

      const result = await pullSchema({
        container,
        input: { force: mode === "force" },
      });

      expect(result.mode).toBe(mode);
      expect(await storedRelatedApps(container)).toStrictEqual({
        local: { code: "CLIENTS" },
        state: { code: "CLIENTS" },
      });
    });

    it.each<[string, RawRelatedApp, FormOptions, RawRelatedApp]>([
      ["参照先が変わった", OTHER_APP, {}, { code: "CLIENTS" }],
      [
        "別のフィールドだけが変わった",
        SAME_APP,
        { otherLabel: "変更後" },
        { code: "CUSTOMERS" },
      ],
    ])("%sリモートを pull で取り込むと、YAML と state はコード指定を保つ", async (_, remote, options, expected) => {
      const { container } = createContainer(remote, options);
      container.schemaStateStorage.setContent(placement.schema(BY_CODE));
      container.schemaStorage.setContent(placement.schema(BY_CODE));

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

      expect(await storedRelatedApps(container)).toStrictEqual({
        local: expected,
        state: expected,
      });
    });
  });

  describe("3-way diff / push", () => {
    it.each<[string, string, string]>([
      ["base とローカルがコード指定", BY_CODE, BY_CODE],
      ["base が ID 指定でローカルがコード指定", BY_ID, BY_CODE],
      ["base がコード指定でローカルが ID 指定", BY_CODE, BY_ID],
      [
        "base が旧版の app と code 入りの state でローカルが ID 指定",
        '{ app: "10", code: "OLD" }',
        BY_ID,
      ],
    ])("%sで、リモートが同じアプリなら、3-way diff は差分なしで、push は何も送らない", async (_, base, local) => {
      const { container, client } = createContainer(SAME_APP);
      container.schemaStateStorage.setContent(placement.schema(base));
      container.schemaStorage.setContent(placement.schema(local));

      const result = await detectThreeWayDiff({ container });
      await pushSchema({ container, input: {} });

      expect(result).toEqual({
        mode: "three-way",
        localChanges: [],
        remoteDrift: [],
        conflicts: [],
        extras: [],
        isEmpty: true,
      });
      expectNoFormMutation(client);
    });

    it("state の { app: null, code } はコード指定として読む", async () => {
      const { container } = createContainer(OTHER_APP);
      container.schemaStateStorage.setContent(
        placement.schema('{ app: , code: "CUSTOMERS" }'),
      );
      container.schemaStorage.setContent(placement.schema(BY_CODE));

      const result = await detectThreeWayDiff({ container });

      expect(result).toMatchObject({
        mode: "three-way",
        localChanges: [],
        remoteDrift: [{ key: placement.changedKey, kind: "remoteOnly" }],
        conflicts: [],
      });
    });

    it("ID 指定の base を、フィールドとレイアウトの両方でローカルのコード指定に揃えて読み込む", async () => {
      const { container } = createContainer(SAME_APP);
      container.schemaStateStorage.setContent(placement.schema(BY_ID));
      container.schemaStorage.setContent(placement.schema(BY_CODE));

      const { state } = await loadThreeWayInputs(container);

      const field = state?.schema.fields.get(placement.fieldCode as FieldCode);
      const [firstItem] = state?.schema.layout ?? [];
      const element =
        firstItem !== undefined && "fields" in firstItem
          ? firstItem.fields.find(
              (e) => e.kind === "field" && e.field.code === placement.fieldCode,
            )
          : undefined;
      expect(
        field === undefined
          ? undefined
          : placement.relatedAppOf(field.properties),
      ).toStrictEqual({ code: "CUSTOMERS" });
      expect(
        element?.kind === "field"
          ? placement.relatedAppOf(element.field.properties)
          : undefined,
      ).toStrictEqual({ code: "CUSTOMERS" });
    });

    it("app も code も無い state は、3-way diff が検証エラーで止まる", async () => {
      const { container } = createContainer(SAME_APP);
      container.schemaStateStorage.setContent(placement.schema("{}"));
      container.schemaStorage.setContent(placement.schema(BY_CODE));

      await expect(detectThreeWayDiff({ container })).rejects.toThrow(
        ValidationError,
      );
    });

    it.each<[string, string, string, Record<string, unknown>]>([
      [
        "ローカルが base のままで、リモートの参照先が変わると remote drift",
        BY_CODE,
        BY_CODE,
        { remoteDrift: [{ key: placement.changedKey, kind: "remoteOnly" }] },
      ],
      [
        "ローカルの指定方法と参照先が変わり、リモートの参照先も変わると conflict",
        BY_ID,
        '{ code: "OTHERS" }',
        { conflicts: [{ key: placement.changedKey, kind: "conflict" }] },
      ],
    ])("%sとして検出し、push は drift で止まる", async (_, base, local, expected) => {
      const { container, client } = createContainer(OTHER_APP);
      container.schemaStateStorage.setContent(placement.schema(base));
      container.schemaStorage.setContent(placement.schema(local));

      const result = await detectThreeWayDiff({ container });

      expect(result).toMatchObject({
        mode: "three-way",
        localChanges: [],
        remoteDrift: [],
        conflicts: [],
        isEmpty: false,
        ...expected,
      });
      await expect(pushSchema({ container, input: {} })).rejects.toThrow(
        ConflictError,
      );
      expectNoFormMutation(client);
    });

    it("ローカルだけ参照先を変えると local change で、push はコード指定だけを送り state に書く", async () => {
      const { container, client } = createContainer(SAME_APP);
      container.schemaStateStorage.setContent(placement.schema(BY_CODE));
      container.schemaStorage.setContent(
        placement.schema('{ code: "OTHERS" }'),
      );

      const result = await detectThreeWayDiff({ container });
      await pushSchema({ container, input: {} });

      expect(result).toMatchObject({
        mode: "three-way",
        localChanges: [{ key: placement.changedKey, kind: "localOnly" }],
        remoteDrift: [],
        conflicts: [],
      });
      expect(client.app.updateFormFields).toHaveBeenCalledTimes(1);
      expect(sentRelatedApp(client, "updateFormFields")).toStrictEqual({
        code: "OTHERS",
      });
      expect((await storedRelatedApps(container)).state).toStrictEqual({
        code: "OTHERS",
      });
    });
  });
});
