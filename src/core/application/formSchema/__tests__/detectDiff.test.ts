import { describe, expect, it } from "vitest";
import { setupTestContainer } from "@/core/application/__tests__/helpers";
import { SystemError, ValidationError } from "@/core/application/error";
import {
  FieldCode,
  type FieldDefinition,
} from "@/core/domain/formSchema/valueObject";
import { detectDiff } from "../detectDiff";

const getContainer = setupTestContainer();

function textField(
  code: string,
  label: string,
  props: Record<string, unknown> = {},
): FieldDefinition {
  return {
    code: FieldCode.create(code),
    type: "SINGLE_LINE_TEXT",
    label,
    properties: props,
  } as FieldDefinition;
}

const schemaYaml = (fieldsYaml: string) => `
layout:
  - type: ROW
    fields:
${fieldsYaml}
`;

const singleFieldSchema = schemaYaml(`
      - code: name
        type: SINGLE_LINE_TEXT
        label: 名前`);

describe("detectDiff", () => {
  it("スキーマとフォームが一致する場合、差分なしを返す", async () => {
    const container = getContainer();
    const field = textField("name", "名前");
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), field]]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ field }] },
    ]);

    const result = await detectDiff({ container });

    expect(result.isEmpty).toBe(true);
    expect(result.entries).toHaveLength(0);
    expect(result.summary.total).toBe(0);
  });

  it("スキーマに新規フィールドがある場合、addedエントリを返す", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    const result = await detectDiff({ container });

    expect(result.isEmpty).toBe(false);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].type).toBe("added");
    expect(result.entries[0].fieldCode).toBe("name");
    expect(result.summary.added).toBe(1);
  });

  it("フォームにスキーマにないフィールドがある場合、deletedエントリを返す", async () => {
    const container = getContainer();
    const emptySchema = `
layout:
  - type: ROW
    fields: []
`;
    container.schemaStorage.setContent(emptySchema);
    const extra = textField("extra", "余分");
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("extra"), extra]]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ field: extra }] },
    ]);

    const result = await detectDiff({ container });

    expect(result.entries.some((e) => e.type === "deleted")).toBe(true);
    expect(result.summary.deleted).toBeGreaterThan(0);
  });

  it("フィールドのラベルが変更された場合、modifiedエントリを返す", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    const oldField = textField("name", "旧名前");
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), oldField]]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ field: oldField }] },
    ]);

    const result = await detectDiff({ container });

    expect(result.entries.some((e) => e.type === "modified")).toBe(true);
    const modified = result.entries.find((e) => e.type === "modified");
    expect(modified?.fieldCode).toBe("name");
  });

  it("レイアウトに変更がある場合、hasLayoutChanges=trueを返す", async () => {
    const container = getContainer();
    const field = textField("name", "名前");
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), field]]),
    );
    // 異なるレイアウト（空のレイアウト）
    container.formConfigurator.setLayout([]);

    const result = await detectDiff({ container });

    expect(result.hasLayoutChanges).toBe(true);
  });

  it("フィールドに差分がなくてもレイアウトが異なる場合はisEmpty=falseになる", async () => {
    const container = getContainer();
    const field = textField("name", "名前");
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), field]]),
    );
    container.formConfigurator.setLayout([]);

    const result = await detectDiff({ container });

    expect(result.summary.total).toBe(0);
    expect(result.hasLayoutChanges).toBe(true);
    expect(result.isEmpty).toBe(false);
  });

  it("schemaFieldsにスキーマ定義のフィールドメタデータを返す", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    const result = await detectDiff({ container });

    expect(result.schemaFields).toHaveLength(1);
    expect(result.schemaFields[0]).toEqual({
      fieldCode: "name",
      fieldLabel: "名前",
      fieldType: "SINGLE_LINE_TEXT",
    });
  });

  it("複数フィールドの追加・変更・削除を同時に検出する", async () => {
    const container = getContainer();
    const schema = `
layout:
  - type: ROW
    fields:
      - code: name
        type: SINGLE_LINE_TEXT
        label: 名前
      - code: new_field
        type: NUMBER
        label: 新規
`;
    container.schemaStorage.setContent(schema);

    const oldName = textField("name", "旧名前");
    const toDelete = textField("old_field", "削除予定");
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("name"), oldName],
        [FieldCode.create("old_field"), toDelete],
      ]),
    );
    container.formConfigurator.setLayout([
      {
        type: "ROW",
        fields: [{ field: oldName }, { field: toDelete }],
      },
    ]);

    const result = await detectDiff({ container });

    expect(result.summary.added).toBe(1);
    expect(result.summary.modified).toBe(1);
    expect(result.summary.deleted).toBe(1);
  });

  it("不正なスキーマテキストの場合はValidationErrorをスローする", async () => {
    const container = getContainer();
    container.schemaStorage.setContent("");
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await expect(detectDiff({ container })).rejects.toThrow(ValidationError);
  });

  it("modifiedエントリのbeforeとafterにフィールド定義のDTOが含まれる", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    const oldField = textField("name", "旧名前", { required: false });
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), oldField]]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ field: oldField }] },
    ]);

    const result = await detectDiff({ container });
    const modified = result.entries.find((e) => e.type === "modified");
    expect(modified).toBeDefined();
    expect(modified?.before).toBeDefined();
    expect(modified?.before?.code).toBe("name");
    expect(modified?.before?.label).toBe("旧名前");
    expect(modified?.after).toBeDefined();
    expect(modified?.after?.code).toBe("name");
    expect(modified?.after?.label).toBe("名前");
  });

  it("addedエントリはbeforeを持たずafterのみ持つ", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    const result = await detectDiff({ container });
    const added = result.entries.find((e) => e.type === "added");
    expect(added).toBeDefined();
    expect(added?.before).toBeUndefined();
    expect(added?.after).toBeDefined();
    expect(added?.after?.type).toBe("SINGLE_LINE_TEXT");
  });

  it("deletedエントリはbeforeを持ちafterを持たない", async () => {
    const container = getContainer();
    const emptySchema = `
layout:
  - type: ROW
    fields: []
`;
    container.schemaStorage.setContent(emptySchema);
    const extra = textField("extra", "余分");
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("extra"), extra]]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ field: extra }] },
    ]);

    const result = await detectDiff({ container });
    const deleted = result.entries.find((e) => e.type === "deleted");
    expect(deleted).toBeDefined();
    expect(deleted?.before).toBeDefined();
    expect(deleted?.before?.code).toBe("extra");
    expect(deleted?.after).toBeUndefined();
  });

  it("レイアウトのみ異なりフィールドに差分がない場合、entriesは空だがisEmptyはfalse", async () => {
    const container = getContainer();
    const field = textField("name", "名前");
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), field]]),
    );
    // スキーマのレイアウトとは異なる(行が2つ)
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ field }] },
      { type: "ROW", fields: [] },
    ]);

    const result = await detectDiff({ container });
    expect(result.entries).toHaveLength(0);
    expect(result.summary.total).toBe(0);
    expect(result.hasLayoutChanges).toBe(true);
    expect(result.isEmpty).toBe(false);
  });

  it("差分エントリは追加→変更→削除の順にソートされている", async () => {
    const container = getContainer();
    const schema = schemaYaml(`
      - code: modified_field
        type: SINGLE_LINE_TEXT
        label: 変更後
      - code: new_field
        type: NUMBER
        label: 新規`);
    container.schemaStorage.setContent(schema);

    const oldField = textField("modified_field", "変更前");
    const toDelete = textField("deleted_field", "削除予定");
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("modified_field"), oldField],
        [FieldCode.create("deleted_field"), toDelete],
      ]),
    );
    container.formConfigurator.setLayout([]);

    const result = await detectDiff({ container });
    const types = result.entries.map((e) => e.type);
    expect(types).toEqual(["added", "modified", "deleted"]);
  });

  it("summaryの各件数がentries内の対応するtypeの件数と一致する", async () => {
    const container = getContainer();
    const schema = schemaYaml(`
      - code: name
        type: SINGLE_LINE_TEXT
        label: 名前_新
      - code: new1
        type: NUMBER
        label: 新規1
      - code: new2
        type: NUMBER
        label: 新規2`);
    container.schemaStorage.setContent(schema);

    const oldName = textField("name", "名前_旧");
    const del1 = textField("old1", "削除1");
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("name"), oldName],
        [FieldCode.create("old1"), del1],
      ]),
    );
    container.formConfigurator.setLayout([]);

    const result = await detectDiff({ container });
    const addedCount = result.entries.filter((e) => e.type === "added").length;
    const modifiedCount = result.entries.filter(
      (e) => e.type === "modified",
    ).length;
    const deletedCount = result.entries.filter(
      (e) => e.type === "deleted",
    ).length;
    expect(result.summary.added).toBe(addedCount);
    expect(result.summary.modified).toBe(modifiedCount);
    expect(result.summary.deleted).toBe(deletedCount);
  });

  it("summary.totalがadded+modified+deletedと等しい", async () => {
    const container = getContainer();
    const schema = schemaYaml(`
      - code: name
        type: SINGLE_LINE_TEXT
        label: 名前_新
      - code: new_field
        type: NUMBER
        label: 新規`);
    container.schemaStorage.setContent(schema);

    const oldName = textField("name", "名前_旧");
    const toDelete = textField("old_field", "削除");
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("name"), oldName],
        [FieldCode.create("old_field"), toDelete],
      ]),
    );
    container.formConfigurator.setLayout([]);

    const result = await detectDiff({ container });
    expect(result.summary.total).toBe(
      result.summary.added + result.summary.modified + result.summary.deleted,
    );
  });

  it("スキーマテキストのフォーマットが不正な場合はValidationErrorをスローする", async () => {
    const container = getContainer();
    container.schemaStorage.setContent("{{invalid yaml");
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await expect(detectDiff({ container })).rejects.toThrow(ValidationError);
  });

  it("スキーマテキストに重複するフィールドコードがある場合はValidationErrorをスローする", async () => {
    const container = getContainer();
    const duplicateSchema = `
layout:
  - type: ROW
    fields:
      - code: name
        type: SINGLE_LINE_TEXT
        label: 名前1
      - code: name
        type: SINGLE_LINE_TEXT
        label: 名前2
`;
    container.schemaStorage.setContent(duplicateSchema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await expect(detectDiff({ container })).rejects.toThrow(ValidationError);
  });

  it("SchemaStorage.get()の通信に失敗した場合、SystemErrorがスローされる", async () => {
    const container = getContainer();
    container.schemaStorage.setFailOn("get");

    await expect(detectDiff({ container })).rejects.toThrow(SystemError);
  });

  it("FormConfigurator.getFields()の通信に失敗した場合、SystemErrorがスローされる", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFailOn("getFields");

    await expect(detectDiff({ container })).rejects.toThrow(SystemError);
  });

  it("FormConfigurator.getLayout()の通信に失敗した場合、SystemErrorがスローされる", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFailOn("getLayout");

    await expect(detectDiff({ container })).rejects.toThrow(SystemError);
  });

  it("GROUP フィールドの追加を検出する", async () => {
    const container = getContainer();
    const schema = `
layout:
  - type: GROUP
    code: grp1
    label: 基本情報
    openGroup: true
    layout:
      - type: ROW
        fields:
          - code: inner
            type: SINGLE_LINE_TEXT
            label: 内部
`;
    container.schemaStorage.setContent(schema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    const result = await detectDiff({ container });

    expect(result.summary.added).toBeGreaterThanOrEqual(1);
    const addedCodes = result.entries
      .filter((e) => e.type === "added")
      .map((e) => e.fieldCode);
    expect(addedCodes).toContain("grp1");
    expect(addedCodes).toContain("inner");
  });

  it("SUBTABLE フィールドの内部フィールド変更を検出する", async () => {
    const container = getContainer();
    const schema = `
layout:
  - type: SUBTABLE
    code: items
    label: 明細
    fields:
      - code: item_name
        type: SINGLE_LINE_TEXT
        label: 品名_新
`;
    container.schemaStorage.setContent(schema);

    const oldInner = textField("item_name", "品名_旧");
    const oldSub: FieldDefinition = {
      code: FieldCode.create("items"),
      type: "SUBTABLE",
      label: "明細",
      properties: {
        fields: new Map([[FieldCode.create("item_name"), oldInner]]),
      },
    } as FieldDefinition;
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("items"), oldSub],
        [FieldCode.create("item_name"), oldInner],
      ]),
    );
    container.formConfigurator.setLayout([
      {
        type: "SUBTABLE",
        code: FieldCode.create("items"),
        label: "明細",
        fields: [{ field: oldInner }],
      },
    ]);

    const result = await detectDiff({ container });

    // サブテーブルの内部フィールド変更はサブテーブル自体の modified として検出
    expect(result.summary.modified).toBeGreaterThanOrEqual(1);
  });

  it("REFERENCE_TABLE フィールドの追加を検出する", async () => {
    const container = getContainer();
    const schema = `
layout:
  - type: ROW
    fields:
      - code: ref
        type: REFERENCE_TABLE
        label: 参照テーブル
        referenceTable:
          relatedApp:
            app: "123"
          condition:
            field: key
            relatedField: relKey
          displayFields:
            - col1
`;
    container.schemaStorage.setContent(schema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    const result = await detectDiff({ container });

    expect(result.summary.added).toBe(1);
    expect(result.entries[0].fieldCode).toBe("ref");
  });

  it("REFERENCE_TABLE の displayFields 変更を検出する", async () => {
    const container = getContainer();
    const schema = `
layout:
  - type: ROW
    fields:
      - code: ref
        type: REFERENCE_TABLE
        label: 参照テーブル
        referenceTable:
          relatedApp:
            app: "123"
          condition:
            field: key
            relatedField: relKey
          displayFields:
            - col1
            - col2
`;
    container.schemaStorage.setContent(schema);

    const currentRef: FieldDefinition = {
      code: FieldCode.create("ref"),
      type: "REFERENCE_TABLE",
      label: "参照テーブル",
      properties: {
        referenceTable: {
          relatedApp: { app: "123" },
          condition: {
            field: FieldCode.create("key"),
            relatedField: FieldCode.create("relKey"),
          },
          displayFields: [FieldCode.create("col1")],
        },
      },
    } as FieldDefinition;
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("ref"), currentRef]]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ field: currentRef }] },
    ]);

    const result = await detectDiff({ container });

    expect(result.summary.modified).toBe(1);
    expect(result.entries[0].fieldCode).toBe("ref");
  });

  it("schemaFields に GROUP と SUBTABLE の情報が含まれる", async () => {
    const container = getContainer();
    const schema = `
layout:
  - type: GROUP
    code: grp
    label: グループ
    layout:
      - type: ROW
        fields:
          - code: inner
            type: SINGLE_LINE_TEXT
            label: 内部
  - type: SUBTABLE
    code: tbl
    label: テーブル
    fields:
      - code: col1
        type: NUMBER
        label: 列1
`;
    container.schemaStorage.setContent(schema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    const result = await detectDiff({ container });

    const fieldTypes = result.schemaFields.map((f) => f.fieldType);
    expect(fieldTypes).toContain("GROUP");
    expect(fieldTypes).toContain("SUBTABLE");
    expect(fieldTypes).toContain("SINGLE_LINE_TEXT");
    expect(fieldTypes).toContain("NUMBER");
  });
});
