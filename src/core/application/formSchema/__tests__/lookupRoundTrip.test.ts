import { describe, expect, it } from "vitest";
import {
  createKintoneBackedFormSchemaContainer,
  schemaFieldIn,
} from "@/core/application/__tests__/helpers";
import { isRecord } from "@/lib/typeGuards";
import { captureSchema } from "../captureSchema";
import { detectDiff } from "../detectDiff";

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

function relatedAppOf(
  field: { readonly properties: Record<string, unknown> } | undefined,
): unknown {
  const lookup = field?.properties.lookup;
  return isRecord(lookup) ? lookup.relatedApp : undefined;
}

describe("lookup の relatedApp の diff の before / after", () => {
  it.each<[string, string, RawRelatedApp, RawRelatedApp]>([
    ["ID 指定", '{ app: "10" }', { app: "11" }, { app: "10" }],
    [
      "コード指定",
      '{ code: "CUSTOMERS" }',
      { code: "CLIENTS" },
      { code: "CUSTOMERS" },
    ],
  ])("%s の YAML と参照先が違うとき、before / after の relatedApp は YAML と同じ指定方法で表す", async (_, local, before, after) => {
    const { container } = createContainer({ app: "11", code: "CLIENTS" });
    container.schemaStorage.setContent(schemaWithRelatedApp(local));

    const result = await detectDiff({ container });

    expect(result.entries).toHaveLength(1);
    const [entry] = result.entries;
    expect(entry).toMatchObject({
      type: "modified",
      fieldCode: "customer_code",
    });
    expect(relatedAppOf(entry?.before)).toStrictEqual(before);
    expect(relatedAppOf(entry?.after)).toStrictEqual(after);
    expect(entry?.details).toMatch(/^lookup: /);
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
