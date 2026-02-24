import { describe, expect, it } from "vitest";
import { setupTestFormSchemaContainer } from "@/core/application/__tests__/helpers";
import { SystemError } from "@/core/application/error";
import {
  FieldCode,
  type FieldDefinition,
  type SubtableFieldDefinition,
} from "@/core/domain/formSchema/valueObject";
import { resetForm } from "../resetForm";

const getContainer = setupTestFormSchemaContainer();

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

describe("resetForm", () => {
  it("カスタムフィールドが存在する場合、すべてのカスタムフィールドのコードが deleteFields に渡される", async () => {
    const container = getContainer();
    const field1 = textField("name", "名前");
    const field2 = textField("email", "メール");
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("name"), field1],
        [FieldCode.create("email"), field2],
      ]),
    );
    container.formConfigurator.setLayout([]);

    await resetForm({ container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.size).toBe(0);
  });

  it("サブテーブル内部フィールドは deleteFields の対象に含まれない", async () => {
    const container = getContainer();
    const innerField = textField("item_name", "品名");
    const subField: SubtableFieldDefinition = {
      code: FieldCode.create("items"),
      type: "SUBTABLE",
      label: "明細",
      properties: {
        fields: new Map([[FieldCode.create("item_name"), innerField]]),
      },
    };
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("items"), subField],
        [FieldCode.create("item_name"), innerField],
      ]),
    );
    container.formConfigurator.setLayout([]);
    container.formConfigurator.resetCallLog();

    await resetForm({ container });

    const fields = await container.formConfigurator.getFields();
    // items（サブテーブル本体）は削除される
    expect(fields.has(FieldCode.create("items"))).toBe(false);
    // item_name はサブテーブル内部フィールドなので直接 deleteFields されない
    expect(fields.has(FieldCode.create("item_name"))).toBe(true);
  });

  it("フィールド削除後に updateLayout が空のレイアウトで呼ばれる", async () => {
    const container = getContainer();
    const field = textField("name", "名前");
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), field]]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ kind: "field", field }] },
    ]);
    container.formConfigurator.resetCallLog();

    await resetForm({ container });

    const allCalls = container.formConfigurator.callLog;
    const deleteIdx = allCalls.indexOf("deleteFields");
    const layoutIdx = allCalls.indexOf("updateLayout");
    expect(deleteIdx).toBeGreaterThan(-1);
    expect(layoutIdx).toBeGreaterThan(-1);
    expect(deleteIdx).toBeLessThan(layoutIdx);

    const layout = await container.formConfigurator.getLayout();
    expect(layout).toHaveLength(0);
  });

  it("カスタムフィールドが0件の場合、deleteFields は呼ばれず updateLayout のみ実行", async () => {
    const container = getContainer();
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);
    container.formConfigurator.resetCallLog();

    await resetForm({ container });

    expect(container.formConfigurator.callLog).not.toContain("deleteFields");
    expect(container.formConfigurator.callLog).toContain("updateLayout");
  });

  it("getFields の通信失敗で SystemError", async () => {
    const container = getContainer();
    container.formConfigurator.setFailOn("getFields");

    await expect(resetForm({ container })).rejects.toThrow(SystemError);
  });

  it("deleteFields の通信失敗で SystemError", async () => {
    const container = getContainer();
    const field = textField("name", "名前");
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), field]]),
    );
    container.formConfigurator.setLayout([]);
    container.formConfigurator.setFailOn("deleteFields");

    await expect(resetForm({ container })).rejects.toThrow(SystemError);
  });

  it("updateLayout の通信失敗で SystemError", async () => {
    const container = getContainer();
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);
    container.formConfigurator.setFailOn("updateLayout");

    await expect(resetForm({ container })).rejects.toThrow(SystemError);
  });
});
