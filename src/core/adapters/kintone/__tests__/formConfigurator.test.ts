import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneRestAPIError } from "@kintone/rest-api-client";
import { describe, expect, it, vi } from "vitest";
import { ConflictError, SystemError } from "@/core/application/error";
import type {
  FieldCode,
  FieldDefinition,
  HrElement,
  LabelElement,
  SpacerElement,
} from "@/core/domain/formSchema/valueObject";
import { KintoneFormConfigurator } from "../formConfigurator";

// kintone REST API Client のモック
function createMockClient(
  overrides: {
    getFormFields?: (params: unknown) => Promise<unknown>;
    addFormFields?: (params: unknown) => Promise<unknown>;
    updateFormFields?: (params: unknown) => Promise<unknown>;
    deleteFormFields?: (params: unknown) => Promise<unknown>;
    getFormLayout?: (params: unknown) => Promise<unknown>;
    updateFormLayout?: (params: unknown) => Promise<unknown>;
  } = {},
) {
  return {
    app: {
      getFormFields: vi.fn(
        overrides.getFormFields ??
          (() => Promise.resolve({ properties: {}, revision: "1" })),
      ),
      addFormFields: vi.fn(
        overrides.addFormFields ?? (() => Promise.resolve({ revision: "1" })),
      ),
      updateFormFields: vi.fn(
        overrides.updateFormFields ??
          (() => Promise.resolve({ revision: "1" })),
      ),
      deleteFormFields: vi.fn(
        overrides.deleteFormFields ??
          (() => Promise.resolve({ revision: "1" })),
      ),
      getFormLayout: vi.fn(
        overrides.getFormLayout ??
          (() => Promise.resolve({ layout: [], revision: "1" })),
      ),
      updateFormLayout: vi.fn(
        overrides.updateFormLayout ??
          (() => Promise.resolve({ revision: "1" })),
      ),
    },
  } as unknown as KintoneRestAPIClient;
}

describe("KintoneFormConfigurator", () => {
  const APP_ID = "1";

  describe("getFields", () => {
    it("SINGLE_LINE_TEXT フィールドを取得すると required, unique, expression 等のプロパティが保持される", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {
              name: {
                type: "SINGLE_LINE_TEXT",
                code: "name",
                label: "名前",
                noLabel: false,
                required: true,
                unique: true,
                defaultValue: "",
                minLength: "1",
                maxLength: "100",
                expression: "",
                hideExpression: false,
              },
            },
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const fields = await adapter.getFields();

      const field = fields.get("name" as FieldCode);
      expect(field).toBeDefined();
      expect(field?.type).toBe("SINGLE_LINE_TEXT");
      expect(field?.label).toBe("名前");
      expect(field?.noLabel).toBe(false);
      expect(field?.properties).toEqual(
        expect.objectContaining({
          required: true,
          unique: true,
          defaultValue: "",
          minLength: "1",
          maxLength: "100",
          expression: "",
          hideExpression: false,
        }),
      );
    });

    it("NUMBER フィールドを取得すると digit, displayScale, unit 等のプロパティが保持される", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {
              price: {
                type: "NUMBER",
                code: "price",
                label: "金額",
                required: true,
                unique: false,
                defaultValue: "0",
                minValue: "0",
                maxValue: "99999999",
                digit: true,
                displayScale: "2",
                unit: "円",
                unitPosition: "AFTER",
              },
            },
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const fields = await adapter.getFields();

      const field = fields.get("price" as FieldCode);
      expect(field?.type).toBe("NUMBER");
      expect(field?.properties).toEqual(
        expect.objectContaining({
          required: true,
          unique: false,
          defaultValue: "0",
          minValue: "0",
          maxValue: "99999999",
          digit: true,
          displayScale: "2",
          unit: "円",
          unitPosition: "AFTER",
        }),
      );
    });

    it("CALC フィールドを取得すると expression, format, hideExpression 等のプロパティが保持される", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {
              total: {
                type: "CALC",
                code: "total",
                label: "合計",
                expression: "price * qty",
                format: "NUMBER",
                displayScale: "0",
                unit: "円",
                unitPosition: "AFTER",
                hideExpression: true,
              },
            },
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const fields = await adapter.getFields();

      const field = fields.get("total" as FieldCode);
      expect(field?.type).toBe("CALC");
      expect(field?.properties).toEqual(
        expect.objectContaining({
          expression: "price * qty",
          format: "NUMBER",
          displayScale: "0",
          unit: "円",
          unitPosition: "AFTER",
          hideExpression: true,
        }),
      );
    });

    it("CHECK_BOX フィールドを取得すると options, align, defaultValue が保持される", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {
              categories: {
                type: "CHECK_BOX",
                code: "categories",
                label: "カテゴリ",
                required: true,
                defaultValue: ["A"],
                options: {
                  A: { label: "カテゴリA", index: "0" },
                  B: { label: "カテゴリB", index: "1" },
                },
                align: "HORIZONTAL",
              },
            },
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const fields = await adapter.getFields();

      const field = fields.get("categories" as FieldCode);
      expect(field?.type).toBe("CHECK_BOX");
      expect(field?.properties).toEqual(
        expect.objectContaining({
          required: true,
          defaultValue: ["A"],
          options: {
            A: { label: "カテゴリA", index: "0" },
            B: { label: "カテゴリB", index: "1" },
          },
          align: "HORIZONTAL",
        }),
      );
    });

    it("RADIO_BUTTON フィールドを取得すると defaultValue が文字列として保持される", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {
              priority: {
                type: "RADIO_BUTTON",
                code: "priority",
                label: "優先度",
                required: true,
                defaultValue: "中",
                options: {
                  高: { label: "高", index: "0" },
                  中: { label: "中", index: "1" },
                  低: { label: "低", index: "2" },
                },
                align: "HORIZONTAL",
              },
            },
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const fields = await adapter.getFields();

      const field = fields.get("priority" as FieldCode);
      expect(field?.type).toBe("RADIO_BUTTON");
      if (field?.type === "RADIO_BUTTON") {
        expect(field.properties.defaultValue).toBe("中");
        expect(field.properties.required).toBe(true);
        expect(field.properties.align).toBe("HORIZONTAL");
      }
    });

    it("RADIO_BUTTON の defaultValue が配列で返された場合、文字列に正規化される", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {
              priority: {
                type: "RADIO_BUTTON",
                code: "priority",
                label: "優先度",
                defaultValue: ["中"],
                options: {
                  高: { label: "高", index: "0" },
                  中: { label: "中", index: "1" },
                },
              },
            },
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const fields = await adapter.getFields();

      const field = fields.get("priority" as FieldCode);
      if (field?.type === "RADIO_BUTTON") {
        expect(field.properties.defaultValue).toBe("中");
      }
    });

    it("USER_SELECT フィールドを取得すると defaultValue と entities が保持される", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {
              assignee: {
                type: "USER_SELECT",
                code: "assignee",
                label: "担当者",
                required: true,
                defaultValue: [{ code: "admin", type: "USER" }],
                entities: [
                  { code: "admin", type: "USER" },
                  { code: "dev", type: "GROUP" },
                ],
              },
            },
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const fields = await adapter.getFields();

      const field = fields.get("assignee" as FieldCode);
      expect(field?.type).toBe("USER_SELECT");
      expect(field?.properties).toEqual(
        expect.objectContaining({
          required: true,
          defaultValue: [{ code: "admin", type: "USER" }],
          entities: [
            { code: "admin", type: "USER" },
            { code: "dev", type: "GROUP" },
          ],
        }),
      );
    });

    it("DATE フィールドを取得すると defaultNowValue が保持される", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {
              due: {
                type: "DATE",
                code: "due",
                label: "期限",
                required: true,
                unique: false,
                defaultValue: "",
                defaultNowValue: true,
              },
            },
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const fields = await adapter.getFields();

      const field = fields.get("due" as FieldCode);
      expect(field?.type).toBe("DATE");
      expect(field?.properties).toEqual(
        expect.objectContaining({
          required: true,
          unique: false,
          defaultValue: "",
          defaultNowValue: true,
        }),
      );
    });

    it("LINK フィールドを取得すると protocol, unique, minLength 等のプロパティが保持される", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {
              website: {
                type: "LINK",
                code: "website",
                label: "Webサイト",
                required: false,
                unique: true,
                defaultValue: "https://example.com",
                minLength: "10",
                maxLength: "500",
                protocol: "WEB",
              },
            },
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const fields = await adapter.getFields();

      const field = fields.get("website" as FieldCode);
      expect(field?.type).toBe("LINK");
      expect(field?.properties).toEqual(
        expect.objectContaining({
          required: false,
          unique: true,
          defaultValue: "https://example.com",
          minLength: "10",
          maxLength: "500",
          protocol: "WEB",
        }),
      );
    });

    it("FILE フィールドを取得すると thumbnailSize が保持される", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {
              attachment: {
                type: "FILE",
                code: "attachment",
                label: "添付ファイル",
                required: true,
                thumbnailSize: "250",
              },
            },
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const fields = await adapter.getFields();

      const field = fields.get("attachment" as FieldCode);
      expect(field?.type).toBe("FILE");
      expect(field?.properties).toEqual(
        expect.objectContaining({
          required: true,
          thumbnailSize: "250",
        }),
      );
    });

    it("SUBTABLE フィールドを取得すると内部フィールドが Map に変換されトップレベルにも登録される", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {
              items: {
                type: "SUBTABLE",
                code: "items",
                label: "明細",
                fields: {
                  name: {
                    type: "SINGLE_LINE_TEXT",
                    code: "name",
                    label: "品名",
                    required: true,
                    maxLength: "200",
                  },
                  qty: {
                    type: "NUMBER",
                    code: "qty",
                    label: "数量",
                    minValue: "1",
                    digit: false,
                  },
                },
              },
            },
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const fields = await adapter.getFields();

      // SUBTABLE 本体
      const subtable = fields.get("items" as FieldCode);
      expect(subtable?.type).toBe("SUBTABLE");
      if (subtable?.type === "SUBTABLE") {
        expect(subtable.properties.fields.size).toBe(2);
        const nameField = subtable.properties.fields.get("name" as FieldCode);
        expect(nameField?.type).toBe("SINGLE_LINE_TEXT");
        expect(nameField?.properties).toEqual(
          expect.objectContaining({
            required: true,
            maxLength: "200",
          }),
        );
      }

      // 内部フィールドもトップレベルに登録
      expect(fields.has("name" as FieldCode)).toBe(true);
      expect(fields.has("qty" as FieldCode)).toBe(true);
    });

    it("REFERENCE_TABLE フィールドを取得すると relatedApp, condition, displayFields が保持される", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {
              related: {
                type: "REFERENCE_TABLE",
                code: "related",
                label: "関連レコード",
                referenceTable: {
                  relatedApp: { app: "42" },
                  condition: { field: "key", relatedField: "rKey" },
                  filterCond: 'status = "active"',
                  displayFields: ["col1", "col2"],
                  sort: "col1 asc",
                  size: "5",
                },
              },
            },
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const fields = await adapter.getFields();

      const field = fields.get("related" as FieldCode);
      expect(field?.type).toBe("REFERENCE_TABLE");
      if (field?.type === "REFERENCE_TABLE") {
        const ref = field.properties.referenceTable;
        expect(ref.relatedApp.app).toBe("42");
        expect(String(ref.condition.field)).toBe("key");
        expect(String(ref.condition.relatedField)).toBe("rKey");
        expect(ref.filterCond).toBe('status = "active"');
        expect(ref.displayFields.map(String)).toEqual(["col1", "col2"]);
        expect(ref.sort).toBe("col1 asc");
        expect(ref.size).toBe("5");
      }
    });

    it("RECORD_NUMBER や CREATOR 等のシステムフィールドは結果から除外される", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {
              name: {
                type: "SINGLE_LINE_TEXT",
                code: "name",
                label: "名前",
              },
              レコード番号: {
                type: "RECORD_NUMBER",
                code: "レコード番号",
                label: "レコード番号",
              },
              作成者: {
                type: "CREATOR",
                code: "作成者",
                label: "作成者",
              },
              作成日時: {
                type: "CREATED_TIME",
                code: "作成日時",
                label: "作成日時",
              },
              更新者: {
                type: "MODIFIER",
                code: "更新者",
                label: "更新者",
              },
              更新日時: {
                type: "UPDATED_TIME",
                code: "更新日時",
                label: "更新日時",
              },
              カテゴリー: {
                type: "CATEGORY",
                code: "カテゴリー",
                label: "カテゴリー",
              },
              ステータス: {
                type: "STATUS",
                code: "ステータス",
                label: "ステータス",
              },
              作業者: {
                type: "STATUS_ASSIGNEE",
                code: "作業者",
                label: "作業者",
              },
            },
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const fields = await adapter.getFields();

      expect(fields.size).toBe(1);
      expect(fields.has("name" as FieldCode)).toBe(true);
    });

    it("プレビュー状態のフィールドを取得するため preview: true でAPIが呼ばれる", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      await adapter.getFields();

      expect(client.app.getFormFields).toHaveBeenCalledWith({
        app: APP_ID,
        preview: true,
      });
    });
  });

  describe("addFields", () => {
    it("フィールド定義の properties がフラット化されて kintone API 形式で送信される", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      const fields: FieldDefinition[] = [
        {
          code: "price" as FieldCode,
          type: "NUMBER",
          label: "金額",
          properties: {
            required: true,
            digit: true,
            unit: "円",
            unitPosition: "AFTER",
          },
        } as FieldDefinition,
      ];

      await adapter.addFields(fields);

      expect(client.app.addFormFields).toHaveBeenCalledWith({
        app: APP_ID,
        properties: {
          price: {
            type: "NUMBER",
            code: "price",
            label: "金額",
            required: true,
            digit: true,
            unit: "円",
            unitPosition: "AFTER",
          },
        },
      });
    });

    it("SUBTABLE の内部フィールド Map がネストされた fields オブジェクトに変換される", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      const innerFields = new Map<FieldCode, FieldDefinition>();
      innerFields.set(
        "col1" as FieldCode,
        {
          code: "col1" as FieldCode,
          type: "SINGLE_LINE_TEXT",
          label: "列1",
          properties: { required: true },
        } as FieldDefinition,
      );

      const fields: FieldDefinition[] = [
        {
          code: "tbl" as FieldCode,
          type: "SUBTABLE",
          label: "テーブル",
          properties: { fields: innerFields },
        } as FieldDefinition,
      ];

      await adapter.addFields(fields);

      const calledWith = (client.app.addFormFields as ReturnType<typeof vi.fn>)
        .mock.calls[0][0] as {
        properties: Record<string, Record<string, unknown>>;
      };
      const tblProp = calledWith.properties.tbl;
      expect(tblProp.type).toBe("SUBTABLE");
      expect(tblProp.fields).toBeDefined();
      const subFields = tblProp.fields as Record<
        string,
        Record<string, unknown>
      >;
      expect(subFields.col1).toBeDefined();
      expect(subFields.col1.type).toBe("SINGLE_LINE_TEXT");
      expect(subFields.col1.required).toBe(true);
    });

    it("REFERENCE_TABLE の referenceTable プロパティがそのまま kintone API 形式で送信される", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      const fields: FieldDefinition[] = [
        {
          code: "ref" as FieldCode,
          type: "REFERENCE_TABLE",
          label: "関連",
          properties: {
            referenceTable: {
              relatedApp: { app: "42" },
              condition: {
                field: "key" as FieldCode,
                relatedField: "rKey" as FieldCode,
              },
              displayFields: ["col1" as FieldCode],
              filterCond: 'status = "active"',
              sort: "col1 asc",
              size: "5",
            },
          },
        } as FieldDefinition,
      ];

      await adapter.addFields(fields);

      const calledWith = (client.app.addFormFields as ReturnType<typeof vi.fn>)
        .mock.calls[0][0] as {
        properties: Record<string, Record<string, unknown>>;
      };
      const refProp = calledWith.properties.ref;
      expect(refProp.type).toBe("REFERENCE_TABLE");
      expect(refProp.referenceTable).toEqual({
        relatedApp: { app: "42" },
        condition: { field: "key", relatedField: "rKey" },
        filterCond: 'status = "active"',
        displayFields: ["col1"],
        sort: "col1 asc",
        size: "5",
      });
    });
  });

  describe("getLayout", () => {
    it("ROW レイアウトを取得するとフィールド要素が LayoutField に変換される", async () => {
      const client = createMockClient({
        getFormLayout: () =>
          Promise.resolve({
            layout: [
              {
                type: "ROW",
                fields: [
                  {
                    type: "SINGLE_LINE_TEXT",
                    code: "name",
                    size: { width: "200" },
                  },
                ],
              },
            ],
            revision: "1",
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const layout = await adapter.getLayout();

      expect(layout).toHaveLength(1);
      expect(layout[0].type).toBe("ROW");
      if (layout[0].type === "ROW") {
        expect(layout[0].fields).toHaveLength(1);
        const el = layout[0].fields[0];
        expect(el.kind).toBe("field");
        if (el.kind === "field") {
          expect(el.field.type).toBe("SINGLE_LINE_TEXT");
          expect(el.size).toEqual({ width: "200" });
        }
      }
    });

    it("GROUP レイアウトを取得すると code, openGroup とネストされた layout が保持される", async () => {
      const client = createMockClient({
        getFormLayout: () =>
          Promise.resolve({
            layout: [
              {
                type: "GROUP",
                code: "grp",
                label: "グループ",
                openGroup: true,
                layout: [
                  {
                    type: "ROW",
                    fields: [
                      {
                        type: "NUMBER",
                        code: "inner",
                        size: { width: "150" },
                      },
                    ],
                  },
                ],
              },
            ],
            revision: "1",
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const layout = await adapter.getLayout();

      expect(layout[0].type).toBe("GROUP");
      if (layout[0].type === "GROUP") {
        expect(String(layout[0].code)).toBe("grp");
        expect(layout[0].openGroup).toBe(true);
        expect(layout[0].layout).toHaveLength(1);
      }
    });

    it("SUBTABLE レイアウトを取得すると code と fields が保持される", async () => {
      const client = createMockClient({
        getFormLayout: () =>
          Promise.resolve({
            layout: [
              {
                type: "SUBTABLE",
                code: "tbl",
                label: "テーブル",
                fields: [
                  {
                    type: "SINGLE_LINE_TEXT",
                    code: "col1",
                    size: { width: "200" },
                  },
                  {
                    type: "NUMBER",
                    code: "col2",
                    size: { width: "150" },
                  },
                ],
              },
            ],
            revision: "1",
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const layout = await adapter.getLayout();

      expect(layout[0].type).toBe("SUBTABLE");
      if (layout[0].type === "SUBTABLE") {
        expect(String(layout[0].code)).toBe("tbl");
        expect(layout[0].fields).toHaveLength(2);
      }
    });

    it("ROW 内の LABEL, SPACER, HR がデコレーション要素として変換される", async () => {
      const client = createMockClient({
        getFormLayout: () =>
          Promise.resolve({
            layout: [
              {
                type: "ROW",
                fields: [
                  {
                    type: "LABEL",
                    label: "見出し",
                    elementId: "el1",
                    size: { width: "400" },
                  },
                  {
                    type: "SPACER",
                    elementId: "el2",
                    size: { width: "100", height: "50" },
                  },
                  {
                    type: "HR",
                    elementId: "el3",
                    size: { width: "600" },
                  },
                ],
              },
            ],
            revision: "1",
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const layout = await adapter.getLayout();

      if (layout[0].type === "ROW") {
        const [label, spacer, hr] = layout[0].fields;

        const labelEl = label as LabelElement;
        expect(labelEl.type).toBe("LABEL");
        expect(labelEl.label).toBe("見出し");
        expect(labelEl.elementId).toBe("el1");

        const spacerEl = spacer as SpacerElement;
        expect(spacerEl.type).toBe("SPACER");
        expect(spacerEl.elementId).toBe("el2");
        expect(spacerEl.size).toEqual({ width: "100", height: "50" });

        const hrEl = hr as HrElement;
        expect(hrEl.type).toBe("HR");
        expect(hrEl.elementId).toBe("el3");
      }
    });

    it("RECORD_NUMBER や CREATOR はレイアウト内で SystemFieldLayout として変換される", async () => {
      const client = createMockClient({
        getFormLayout: () =>
          Promise.resolve({
            layout: [
              {
                type: "ROW",
                fields: [
                  {
                    type: "RECORD_NUMBER",
                    code: "レコード番号",
                    size: { width: "100" },
                  },
                  {
                    type: "CREATOR",
                    code: "作成者",
                    size: { width: "150" },
                  },
                ],
              },
            ],
            revision: "1",
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const layout = await adapter.getLayout();

      if (layout[0].type === "ROW") {
        const [recNum, creator] = layout[0].fields;
        // システムフィールドは SystemFieldLayout として変換
        expect(recNum.kind).toBe("systemField");
        if (recNum.kind === "systemField") {
          expect(recNum.code).toBe("レコード番号");
          expect(recNum.type).toBe("RECORD_NUMBER");
        }
        if (creator.kind === "systemField") {
          expect(creator.code).toBe("作成者");
          expect(creator.type).toBe("CREATOR");
        }
      }
    });

    it("REFERENCE_TABLE レイアウトを取得すると code が保持される", async () => {
      const client = createMockClient({
        getFormLayout: () =>
          Promise.resolve({
            layout: [
              {
                type: "REFERENCE_TABLE",
                code: "ref_tbl",
                label: "関連レコード",
              },
            ],
            revision: "1",
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const layout = await adapter.getLayout();

      expect(layout).toHaveLength(1);
      expect(layout[0].type).toBe("REFERENCE_TABLE");
      if (layout[0].type === "REFERENCE_TABLE") {
        expect(String(layout[0].code)).toBe("ref_tbl");
        expect(layout[0].label).toBe("関連レコード");
      }
    });

    it("プレビュー状態のレイアウトを取得するため preview: true でAPIが呼ばれる", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      await adapter.getLayout();

      expect(client.app.getFormLayout).toHaveBeenCalledWith({
        app: APP_ID,
        preview: true,
      });
    });
  });

  describe("updateLayout", () => {
    it("ROW 内の LayoutField が type, code, size 形式に変換されて送信される", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await adapter.updateLayout([
        {
          type: "ROW",
          fields: [
            {
              kind: "field",
              field: {
                code: "name" as FieldCode,
                type: "SINGLE_LINE_TEXT",
                label: "名前",
                properties: {},
              } as FieldDefinition,
              size: { width: "200" },
            },
          ],
        },
      ]);

      const calledWith = (
        client.app.updateFormLayout as ReturnType<typeof vi.fn>
      ).mock.calls[0][0] as { layout: unknown[] };
      const row = calledWith.layout[0] as {
        type: string;
        fields: Array<{ type: string; code: string; size?: unknown }>;
      };
      expect(row.type).toBe("ROW");
      expect(row.fields[0]).toEqual({
        type: "SINGLE_LINE_TEXT",
        code: "name",
        size: { width: "200" },
      });
    });

    it("GROUP レイアウトが type, code, openGroup を持つ kintone 形式に変換される", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await adapter.updateLayout([
        {
          type: "GROUP",
          code: "grp" as FieldCode,
          label: "グループ",
          openGroup: true,
          layout: [{ type: "ROW" as const, fields: [] }],
        },
      ]);

      const calledWith = (
        client.app.updateFormLayout as ReturnType<typeof vi.fn>
      ).mock.calls[0][0] as { layout: unknown[] };
      const group = calledWith.layout[0] as Record<string, unknown>;
      expect(group.type).toBe("GROUP");
      expect(group.code).toBe("grp");
      expect(group.openGroup).toBe(true);
    });

    it("SUBTABLE レイアウトが type, code と fields を持つ kintone 形式に変換される", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await adapter.updateLayout([
        {
          type: "SUBTABLE",
          code: "tbl" as FieldCode,
          label: "テーブル",
          fields: [
            {
              kind: "field",
              field: {
                code: "col1" as FieldCode,
                type: "SINGLE_LINE_TEXT",
                label: "列1",
                properties: {},
              } as FieldDefinition,
            },
          ],
        },
      ]);

      const calledWith = (
        client.app.updateFormLayout as ReturnType<typeof vi.fn>
      ).mock.calls[0][0] as { layout: unknown[] };
      const subtable = calledWith.layout[0] as Record<string, unknown>;
      expect(subtable.type).toBe("SUBTABLE");
      expect(subtable.code).toBe("tbl");
    });

    it("REFERENCE_TABLE レイアウトが type, code を持つ kintone 形式に変換される", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await adapter.updateLayout([
        {
          type: "REFERENCE_TABLE",
          code: "ref_tbl" as FieldCode,
          label: "関連レコード",
        },
      ]);

      const calledWith = (
        client.app.updateFormLayout as ReturnType<typeof vi.fn>
      ).mock.calls[0][0] as { layout: unknown[] };
      const refTable = calledWith.layout[0] as Record<string, unknown>;
      expect(refTable.type).toBe("REFERENCE_TABLE");
      expect(refTable.code).toBe("ref_tbl");
    });

    it("LABEL, SPACER, HR がそのまま kintone API 形式で送信される", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await adapter.updateLayout([
        {
          type: "ROW",
          fields: [
            {
              kind: "decoration",
              type: "LABEL" as const,
              label: "見出し",
              elementId: "el1",
              size: { width: "400" },
            },
            {
              kind: "decoration",
              type: "SPACER" as const,
              elementId: "el2",
              size: { width: "100" },
            },
            {
              kind: "decoration",
              type: "HR" as const,
              elementId: "el3",
              size: { width: "600" },
            },
          ],
        },
      ]);

      const calledWith = (
        client.app.updateFormLayout as ReturnType<typeof vi.fn>
      ).mock.calls[0][0] as { layout: unknown[] };
      const row = calledWith.layout[0] as {
        type: string;
        fields: Array<Record<string, unknown>>;
      };

      expect(row.fields[0]).toEqual({
        type: "LABEL",
        label: "見出し",
        elementId: "el1",
        size: { width: "400" },
      });
      expect(row.fields[1]).toEqual({
        type: "SPACER",
        elementId: "el2",
        size: { width: "100" },
      });
      expect(row.fields[2]).toEqual({
        type: "HR",
        elementId: "el3",
        size: { width: "600" },
      });
    });

    it("事前に読み取りがない場合、revision: -1 でAPIが呼ばれる", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      await adapter.updateLayout([]);

      expect(client.app.updateFormLayout).toHaveBeenCalledWith(
        expect.objectContaining({ revision: -1 }),
      );
    });
  });

  describe("getFields → addFields ラウンドトリップ", () => {
    it("getFields で取得したフィールドを addFields で再投入するとプロパティが欠落しない", async () => {
      const kintoneProperties: Record<string, Record<string, unknown>> = {
        text: {
          type: "SINGLE_LINE_TEXT",
          code: "text",
          label: "テキスト",
          required: true,
          unique: false,
          defaultValue: "初期値",
        },
        num: {
          type: "NUMBER",
          code: "num",
          label: "数値",
          required: true,
          digit: true,
          unit: "円",
          unitPosition: "AFTER",
        },
        calc: {
          type: "CALC",
          code: "calc",
          label: "計算",
          expression: "num * 2",
          format: "NUMBER",
          hideExpression: false,
        },
        cb: {
          type: "CHECK_BOX",
          code: "cb",
          label: "チェック",
          options: { A: { label: "A", index: "0" } },
          align: "HORIZONTAL",
          defaultValue: ["A"],
        },
        date: {
          type: "DATE",
          code: "date",
          label: "日付",
          defaultNowValue: true,
          unique: false,
        },
        link: {
          type: "LINK",
          code: "link",
          label: "リンク",
          protocol: "WEB",
          unique: true,
        },
        user: {
          type: "USER_SELECT",
          code: "user",
          label: "ユーザー",
          defaultValue: [{ code: "admin", type: "USER" }],
          entities: [{ code: "admin", type: "USER" }],
        },
        file: {
          type: "FILE",
          code: "file",
          label: "ファイル",
          thumbnailSize: "250",
        },
      };

      let capturedAddProperties: Record<
        string,
        Record<string, unknown>
      > | null = null;

      const client = createMockClient({
        getFormFields: () => Promise.resolve({ properties: kintoneProperties }),
        addFormFields: (params: unknown) => {
          capturedAddProperties = (
            params as { properties: Record<string, Record<string, unknown>> }
          ).properties;
          return Promise.resolve({ revision: "2" });
        },
      });

      const adapter = new KintoneFormConfigurator(client, APP_ID);

      // getFields で取得
      const fields = await adapter.getFields();
      expect(fields.size).toBe(8);

      // addFields で再投入
      await adapter.addFields([...fields.values()]);

      // 変換されたプロパティがオリジナルと一致するか検証
      expect(capturedAddProperties).not.toBeNull();
      const props = capturedAddProperties as unknown as Record<
        string,
        Record<string, unknown>
      >;
      for (const [code, original] of Object.entries(kintoneProperties)) {
        const converted = props[code];
        expect(converted).toBeDefined();
        // type, code, label は共通
        expect(converted.type).toBe(original.type);
        expect(converted.code).toBe(original.code);
        expect(converted.label).toBe(original.label);

        // フィールドタイプ固有プロパティを検証
        for (const [key, value] of Object.entries(original)) {
          if (["type", "code", "label"].includes(key)) continue;
          expect(converted[key]).toEqual(value);
        }
      }
    });
  });

  describe("revision tracking", () => {
    it("getFields で取得した revision が addFields に渡される", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {},
            revision: "5",
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      await adapter.getFields();
      await adapter.addFields([]);

      expect(client.app.addFormFields).toHaveBeenCalledWith(
        expect.objectContaining({ revision: "5" }),
      );
    });

    it("getFields で取得した revision が updateFields に渡される", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {},
            revision: "5",
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      await adapter.getFields();
      await adapter.updateFields([]);

      expect(client.app.updateFormFields).toHaveBeenCalledWith(
        expect.objectContaining({ revision: "5" }),
      );
    });

    it("getFields で取得した revision が deleteFields に渡される", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {},
            revision: "5",
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      await adapter.getFields();
      await adapter.deleteFields([]);

      expect(client.app.deleteFormFields).toHaveBeenCalledWith(
        expect.objectContaining({ revision: "5" }),
      );
    });

    it("getLayout で取得した revision が updateLayout に渡される", async () => {
      const client = createMockClient({
        getFormLayout: () =>
          Promise.resolve({
            layout: [],
            revision: "7",
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      await adapter.getLayout();
      await adapter.updateLayout([]);

      expect(client.app.updateFormLayout).toHaveBeenCalledWith(
        expect.objectContaining({ revision: 7 }),
      );
    });

    it("連続した mutation で revision がチェーンされる", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {},
            revision: "5",
          }),
        addFormFields: () => Promise.resolve({ revision: "6" }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      await adapter.getFields();
      await adapter.addFields([]);
      await adapter.updateLayout([]);

      expect(client.app.addFormFields).toHaveBeenCalledWith(
        expect.objectContaining({ revision: "5" }),
      );
      expect(client.app.updateFormLayout).toHaveBeenCalledWith(
        expect.objectContaining({ revision: 6 }),
      );
    });

    it("並列読み取りで大きい方の revision が使われる", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {},
            revision: "10",
          }),
        getFormLayout: () =>
          Promise.resolve({
            layout: [],
            revision: "12",
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      await Promise.all([adapter.getFields(), adapter.getLayout()]);
      await adapter.addFields([]);

      expect(client.app.addFormFields).toHaveBeenCalledWith(
        expect.objectContaining({ revision: "12" }),
      );
    });

    it("事前読み取りなしの addFields は revision パラメータを含まない", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      await adapter.addFields([]);

      const calledWith = (client.app.addFormFields as ReturnType<typeof vi.fn>)
        .mock.calls[0][0] as Record<string, unknown>;
      expect(calledWith).not.toHaveProperty("revision");
    });

    it("revision 競合時に ConflictError がスローされる", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {},
            revision: "5",
          }),
        addFormFields: () => {
          throw new KintoneRestAPIError({
            data: {
              id: "test",
              code: "GAIA_CO02",
              message: "revision conflict",
            },
            status: 409,
            statusText: "Conflict",
            headers: {},
          });
        },
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      await adapter.getFields();

      await expect(adapter.addFields([])).rejects.toThrow(ConflictError);
    });

    it("競合以外のAPIエラーは従来通り SystemError がスローされる", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {},
            revision: "5",
          }),
        addFormFields: () => {
          throw new KintoneRestAPIError({
            data: {
              id: "test",
              code: "GAIA_RE01",
              message: "some other error",
            },
            status: 500,
            statusText: "Internal Server Error",
            headers: {},
          });
        },
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      await adapter.getFields();

      await expect(adapter.addFields([])).rejects.toThrow(SystemError);
    });

    it("updateFields で revision 競合時に ConflictError がスローされる", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {},
            revision: "5",
          }),
        updateFormFields: () => {
          throw new KintoneRestAPIError({
            data: {
              id: "test",
              code: "GAIA_CO02",
              message: "revision conflict",
            },
            status: 409,
            statusText: "Conflict",
            headers: {},
          });
        },
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      await adapter.getFields();

      await expect(adapter.updateFields([])).rejects.toThrow(ConflictError);
    });

    it("updateFields で競合以外のAPIエラーは SystemError がスローされる", async () => {
      const client = createMockClient({
        updateFormFields: () => {
          throw new Error("Network error");
        },
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await expect(adapter.updateFields([])).rejects.toThrow(SystemError);
    });

    it("deleteFields で revision 競合時に ConflictError がスローされる", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {},
            revision: "5",
          }),
        deleteFormFields: () => {
          throw new KintoneRestAPIError({
            data: {
              id: "test",
              code: "GAIA_CO02",
              message: "revision conflict",
            },
            status: 409,
            statusText: "Conflict",
            headers: {},
          });
        },
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      await adapter.getFields();

      await expect(adapter.deleteFields(["code" as FieldCode])).rejects.toThrow(
        ConflictError,
      );
    });

    it("deleteFields で競合以外のAPIエラーは SystemError がスローされる", async () => {
      const client = createMockClient({
        deleteFormFields: () => {
          throw new Error("Network error");
        },
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await expect(adapter.deleteFields(["code" as FieldCode])).rejects.toThrow(
        SystemError,
      );
    });

    it("getFields のAPIエラーは SystemError がスローされる", async () => {
      const client = createMockClient({
        getFormFields: () => {
          throw new Error("Network error");
        },
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await expect(adapter.getFields()).rejects.toThrow(SystemError);
    });

    it("getLayout のAPIエラーは SystemError がスローされる", async () => {
      const client = createMockClient({
        getFormLayout: () => {
          throw new Error("Network error");
        },
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await expect(adapter.getLayout()).rejects.toThrow(SystemError);
    });

    it("updateLayout で revision 競合時に ConflictError がスローされる", async () => {
      const client = createMockClient({
        updateFormLayout: () => {
          throw new KintoneRestAPIError({
            data: {
              id: "test",
              code: "GAIA_CO02",
              message: "revision conflict",
            },
            status: 409,
            statusText: "Conflict",
            headers: {},
          });
        },
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await expect(adapter.updateLayout([])).rejects.toThrow(ConflictError);
    });

    it("updateLayout で競合以外のAPIエラーは SystemError がスローされる", async () => {
      const client = createMockClient({
        updateFormLayout: () => {
          throw new Error("Network error");
        },
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await expect(adapter.updateLayout([])).rejects.toThrow(SystemError);
    });
  });

  describe("未知のフィールド型", () => {
    it("getFields で未知のフィールド型が返された場合、SystemError がスローされる", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {
              unknown: {
                type: "TOTALLY_UNKNOWN_TYPE",
                code: "unknown",
                label: "不明",
              },
            },
            revision: "1",
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await expect(adapter.getFields()).rejects.toThrow(SystemError);
    });

    it("getLayout で未知のレイアウトアイテム型が返された場合、SystemError がスローされる", async () => {
      const client = createMockClient({
        getFormLayout: () =>
          Promise.resolve({
            layout: [{ type: "UNKNOWN_LAYOUT_TYPE" }],
            revision: "1",
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await expect(adapter.getLayout()).rejects.toThrow(SystemError);
    });

    it("getLayout で ROW 内に未知のフィールド型がある場合、SystemError がスローされる", async () => {
      const client = createMockClient({
        getFormLayout: () =>
          Promise.resolve({
            layout: [
              {
                type: "ROW",
                fields: [
                  {
                    type: "TOTALLY_UNKNOWN_FIELD",
                    code: "unknown",
                  },
                ],
              },
            ],
            revision: "1",
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await expect(adapter.getLayout()).rejects.toThrow(SystemError);
    });
  });

  describe("SystemFieldLayout の変換", () => {
    it("updateLayout で SystemFieldLayout が code, type, size 形式に変換される", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await adapter.updateLayout([
        {
          type: "ROW",
          fields: [
            {
              kind: "systemField",
              code: "レコード番号",
              type: "RECORD_NUMBER",
              size: { width: "100" },
            },
          ],
        },
      ]);

      const calledWith = (
        client.app.updateFormLayout as ReturnType<typeof vi.fn>
      ).mock.calls[0][0] as { layout: unknown[] };
      const row = calledWith.layout[0] as {
        type: string;
        fields: Array<Record<string, unknown>>;
      };
      expect(row.fields[0]).toEqual({
        type: "RECORD_NUMBER",
        code: "レコード番号",
        size: { width: "100" },
      });
    });

    it("updateLayout で size のない SystemFieldLayout は size なしで変換される", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await adapter.updateLayout([
        {
          type: "ROW",
          fields: [
            {
              kind: "systemField",
              code: "CREATOR",
              type: "CREATOR",
            },
          ],
        },
      ]);

      const calledWith = (
        client.app.updateFormLayout as ReturnType<typeof vi.fn>
      ).mock.calls[0][0] as { layout: unknown[] };
      const row = calledWith.layout[0] as {
        type: string;
        fields: Array<Record<string, unknown>>;
      };
      expect(row.fields[0]).toEqual({
        type: "CREATOR",
        code: "CREATOR",
      });
    });
  });

  describe("updateFields のデータ変換", () => {
    it("updateFields でフィールド定義が kintone API 形式に変換されて送信される", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      const fields: FieldDefinition[] = [
        {
          code: "name" as FieldCode,
          type: "SINGLE_LINE_TEXT",
          label: "名前",
          properties: { required: true, unique: false },
        } as FieldDefinition,
      ];

      await adapter.updateFields(fields);

      expect(client.app.updateFormFields).toHaveBeenCalledWith({
        app: APP_ID,
        properties: {
          name: {
            type: "SINGLE_LINE_TEXT",
            code: "name",
            label: "名前",
            required: true,
            unique: false,
          },
        },
      });
    });

    it("deleteFields でフィールドコードが文字列配列に変換されて送信される", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await adapter.deleteFields([
        "field1" as FieldCode,
        "field2" as FieldCode,
      ]);

      expect(client.app.deleteFormFields).toHaveBeenCalledWith({
        app: APP_ID,
        fields: ["field1", "field2"],
      });
    });
  });

  describe("noLabel の有無による変換", () => {
    it("noLabel が未定義のフィールドを getFields で取得すると noLabel プロパティが含まれない", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {
              name: {
                type: "SINGLE_LINE_TEXT",
                code: "name",
                label: "名前",
                required: true,
              },
            },
            revision: "1",
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const fields = await adapter.getFields();

      const field = fields.get("name" as FieldCode);
      expect(field).toBeDefined();
      expect(field?.noLabel).toBeUndefined();
    });

    it("noLabel 付きフィールドを addFields で送信すると noLabel が kintone API に含まれる", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await adapter.addFields([
        {
          code: "name" as FieldCode,
          type: "SINGLE_LINE_TEXT",
          label: "名前",
          noLabel: true,
          properties: { required: true },
        } as FieldDefinition,
      ]);

      const calledWith = (client.app.addFormFields as ReturnType<typeof vi.fn>)
        .mock.calls[0][0] as {
        properties: Record<string, Record<string, unknown>>;
      };
      expect(calledWith.properties.name.noLabel).toBe(true);
    });

    it("noLabel 未定義のフィールドを addFields で送信すると noLabel が含まれない", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await adapter.addFields([
        {
          code: "name" as FieldCode,
          type: "SINGLE_LINE_TEXT",
          label: "名前",
          properties: { required: true },
        } as FieldDefinition,
      ]);

      const calledWith = (client.app.addFormFields as ReturnType<typeof vi.fn>)
        .mock.calls[0][0] as {
        properties: Record<string, Record<string, unknown>>;
      };
      expect(calledWith.properties.name).not.toHaveProperty("noLabel");
    });
  });

  describe("GROUP の openGroup 省略時の振る舞い", () => {
    it("openGroup が未定義の GROUP レイアウトを取得すると openGroup プロパティが含まれない", async () => {
      const client = createMockClient({
        getFormLayout: () =>
          Promise.resolve({
            layout: [
              {
                type: "GROUP",
                code: "grp",
                label: "グループ",
                layout: [{ type: "ROW", fields: [] }],
              },
            ],
            revision: "1",
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const layout = await adapter.getLayout();

      if (layout[0].type === "GROUP") {
        expect(layout[0].openGroup).toBeUndefined();
      }
    });

    it("openGroup が未定義の GROUP を updateLayout で送信すると openGroup が含まれない", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await adapter.updateLayout([
        {
          type: "GROUP",
          code: "grp" as FieldCode,
          label: "グループ",
          layout: [{ type: "ROW" as const, fields: [] }],
        },
      ]);

      const calledWith = (
        client.app.updateFormLayout as ReturnType<typeof vi.fn>
      ).mock.calls[0][0] as { layout: unknown[] };
      const group = calledWith.layout[0] as Record<string, unknown>;
      expect(group).not.toHaveProperty("openGroup");
    });
  });

  describe("レイアウト要素の size 省略時の振る舞い", () => {
    it("size なしのフィールドを getLayout で取得すると size プロパティが含まれない", async () => {
      const client = createMockClient({
        getFormLayout: () =>
          Promise.resolve({
            layout: [
              {
                type: "ROW",
                fields: [
                  {
                    type: "SINGLE_LINE_TEXT",
                    code: "name",
                  },
                ],
              },
            ],
            revision: "1",
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const layout = await adapter.getLayout();

      if (layout[0].type === "ROW") {
        const el = layout[0].fields[0];
        if (el.kind === "field") {
          expect(el.size).toBeUndefined();
        }
      }
    });

    it("size なしのフィールドを updateLayout で送信すると size が含まれない", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await adapter.updateLayout([
        {
          type: "ROW",
          fields: [
            {
              kind: "field",
              field: {
                code: "name" as FieldCode,
                type: "SINGLE_LINE_TEXT",
                label: "名前",
                properties: {},
              } as FieldDefinition,
            },
          ],
        },
      ]);

      const calledWith = (
        client.app.updateFormLayout as ReturnType<typeof vi.fn>
      ).mock.calls[0][0] as { layout: unknown[] };
      const row = calledWith.layout[0] as {
        fields: Array<Record<string, unknown>>;
      };
      expect(row.fields[0]).not.toHaveProperty("size");
    });

    it("size なしのシステムフィールドを getLayout で取得すると size が含まれない", async () => {
      const client = createMockClient({
        getFormLayout: () =>
          Promise.resolve({
            layout: [
              {
                type: "ROW",
                fields: [
                  {
                    type: "RECORD_NUMBER",
                    code: "レコード番号",
                  },
                ],
              },
            ],
            revision: "1",
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const layout = await adapter.getLayout();

      if (layout[0].type === "ROW") {
        const el = layout[0].fields[0];
        if (el.kind === "systemField") {
          expect(el).not.toHaveProperty("size");
        }
      }
    });
  });

  describe("SUBTABLE の updateFields 変換", () => {
    it("SUBTABLE フィールドを updateFields で送信すると内部フィールドがネストされた形式に変換される", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      const innerFields = new Map<FieldCode, FieldDefinition>();
      innerFields.set(
        "col1" as FieldCode,
        {
          code: "col1" as FieldCode,
          type: "SINGLE_LINE_TEXT",
          label: "列1",
          properties: { required: true },
        } as FieldDefinition,
      );

      await adapter.updateFields([
        {
          code: "tbl" as FieldCode,
          type: "SUBTABLE",
          label: "テーブル",
          properties: { fields: innerFields },
        } as FieldDefinition,
      ]);

      const calledWith = (
        client.app.updateFormFields as ReturnType<typeof vi.fn>
      ).mock.calls[0][0] as {
        properties: Record<string, Record<string, unknown>>;
      };
      const tblProp = calledWith.properties.tbl;
      expect(tblProp.type).toBe("SUBTABLE");
      expect(tblProp.fields).toBeDefined();
      const subFields = tblProp.fields as Record<
        string,
        Record<string, unknown>
      >;
      expect(subFields.col1.type).toBe("SINGLE_LINE_TEXT");
      expect(subFields.col1.required).toBe(true);
    });

    it("REFERENCE_TABLE フィールドを updateFields で送信すると referenceTable 形式に変換される", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      await adapter.updateFields([
        {
          code: "ref" as FieldCode,
          type: "REFERENCE_TABLE",
          label: "関連",
          properties: {
            referenceTable: {
              relatedApp: { app: "42" },
              condition: {
                field: "key" as FieldCode,
                relatedField: "rKey" as FieldCode,
              },
              displayFields: ["col1" as FieldCode],
              sort: "col1 asc",
            },
          },
        } as FieldDefinition,
      ]);

      const calledWith = (
        client.app.updateFormFields as ReturnType<typeof vi.fn>
      ).mock.calls[0][0] as {
        properties: Record<string, Record<string, unknown>>;
      };
      const refProp = calledWith.properties.ref;
      expect(refProp.type).toBe("REFERENCE_TABLE");
      const refTable = refProp.referenceTable as Record<string, unknown>;
      expect(refTable.relatedApp).toEqual({ app: "42" });
      expect(refTable.condition).toEqual({
        field: "key",
        relatedField: "rKey",
      });
      expect(refTable.displayFields).toEqual(["col1"]);
      expect(refTable.sort).toBe("col1 asc");
      expect(refTable).not.toHaveProperty("filterCond");
      expect(refTable).not.toHaveProperty("size");
    });
  });

  describe("parseElementSize の部分プロパティ", () => {
    it("height と innerHeight のみ持つ size のフィールドを取得すると width が含まれない", async () => {
      const client = createMockClient({
        getFormLayout: () =>
          Promise.resolve({
            layout: [
              {
                type: "ROW",
                fields: [
                  {
                    type: "MULTI_LINE_TEXT",
                    code: "note",
                    size: { height: "200", innerHeight: "180" },
                  },
                ],
              },
            ],
            revision: "1",
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const layout = await adapter.getLayout();

      if (layout[0].type === "ROW") {
        const el = layout[0].fields[0];
        if (el.kind === "field") {
          expect(el.size).toEqual({ height: "200", innerHeight: "180" });
          expect(el.size).not.toHaveProperty("width");
        }
      }
    });
  });

  describe("REFERENCE_TABLE の filterCond/sort/size が省略可能", () => {
    it("filterCond, sort, size が省略された REFERENCE_TABLE を取得できる", async () => {
      const client = createMockClient({
        getFormFields: () =>
          Promise.resolve({
            properties: {
              ref: {
                type: "REFERENCE_TABLE",
                code: "ref",
                label: "参照",
                referenceTable: {
                  relatedApp: { app: "10" },
                  condition: { field: "key", relatedField: "rKey" },
                  displayFields: ["col1"],
                },
              },
            },
            revision: "1",
          }),
      });
      const adapter = new KintoneFormConfigurator(client, APP_ID);
      const fields = await adapter.getFields();

      const field = fields.get("ref" as FieldCode);
      expect(field?.type).toBe("REFERENCE_TABLE");
      if (field?.type === "REFERENCE_TABLE") {
        const ref = field.properties.referenceTable;
        expect(ref.filterCond).toBeUndefined();
        expect(ref.sort).toBeUndefined();
        expect(ref.size).toBeUndefined();
      }
    });

    it("filterCond, sort, size 省略の REFERENCE_TABLE を addFields で送信すると省略キーが含まれない", async () => {
      const client = createMockClient();
      const adapter = new KintoneFormConfigurator(client, APP_ID);

      const fields: FieldDefinition[] = [
        {
          code: "ref" as FieldCode,
          type: "REFERENCE_TABLE",
          label: "参照",
          properties: {
            referenceTable: {
              relatedApp: { app: "10" },
              condition: {
                field: "key" as FieldCode,
                relatedField: "rKey" as FieldCode,
              },
              displayFields: ["col1" as FieldCode],
            },
          },
        } as FieldDefinition,
      ];

      await adapter.addFields(fields);

      const calledWith = (client.app.addFormFields as ReturnType<typeof vi.fn>)
        .mock.calls[0][0] as {
        properties: Record<string, Record<string, unknown>>;
      };
      const refProp = calledWith.properties.ref;
      const refTable = refProp.referenceTable as Record<string, unknown>;
      expect(refTable).not.toHaveProperty("filterCond");
      expect(refTable).not.toHaveProperty("sort");
      expect(refTable).not.toHaveProperty("size");
    });
  });
});
