import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { FormSchemaErrorCode } from "../../errorCode";
import type { FieldCode } from "../../valueObject";
import { SchemaParser } from "../schemaParser";

describe("SchemaParser", () => {
  describe("正常系", () => {
    it("SINGLE_LINE_TEXT フィールドの type, label, properties が正しく設定される", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: name
        type: SINGLE_LINE_TEXT
        label: 名前
        required: true
`;
      const schema = SchemaParser.parse(yaml);
      expect(schema.fields.size).toBe(1);
      const field = schema.fields.get("name" as FieldCode);
      expect(field).toBeDefined();
      expect(field?.type).toBe("SINGLE_LINE_TEXT");
      expect(field?.label).toBe("名前");
      expect(field?.properties).toEqual({ required: true });
    });

    it("NUMBER フィールドの unit と unitPosition が properties に含まれる", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: price
        type: NUMBER
        label: 価格
        unitPosition: AFTER
        unit: 円
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("price" as FieldCode);
      expect(field?.type).toBe("NUMBER");
      expect(field?.properties).toEqual({ unitPosition: "AFTER", unit: "円" });
    });

    it("CALC フィールドの expression と format が properties に含まれる", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: total
        type: CALC
        label: 合計
        expression: price * quantity
        format: NUMBER
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("total" as FieldCode);
      expect(field?.type).toBe("CALC");
      expect(field?.properties).toEqual({
        expression: "price * quantity",
        format: "NUMBER",
      });
    });

    it("DROP_DOWN フィールドの type が正しく設定される", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: status
        type: DROP_DOWN
        label: ステータス
        options:
          open:
            label: 開始
            index: "0"
        align: VERTICAL
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("status" as FieldCode);
      expect(field?.type).toBe("DROP_DOWN");
    });

    it("DATE, TIME, DATETIME の各 type が正しく設定される", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: d
        type: DATE
        label: 日付
      - code: t
        type: TIME
        label: 時間
      - code: dt
        type: DATETIME
        label: 日時
`;
      const schema = SchemaParser.parse(yaml);
      expect(schema.fields.size).toBe(3);
      expect(schema.fields.get("d" as FieldCode)?.type).toBe("DATE");
      expect(schema.fields.get("t" as FieldCode)?.type).toBe("TIME");
      expect(schema.fields.get("dt" as FieldCode)?.type).toBe("DATETIME");
    });

    it("LINK フィールドの protocol が properties に含まれる", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: url
        type: LINK
        label: URL
        protocol: WEB
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("url" as FieldCode);
      expect(field?.type).toBe("LINK");
      expect(field?.properties).toEqual({ protocol: "WEB" });
    });

    it("USER_SELECT, ORGANIZATION_SELECT, GROUP_SELECT の3フィールドが登録される", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: user
        type: USER_SELECT
        label: ユーザー
      - code: org
        type: ORGANIZATION_SELECT
        label: 組織
      - code: grp
        type: GROUP_SELECT
        label: グループ
`;
      const schema = SchemaParser.parse(yaml);
      expect(schema.fields.size).toBe(3);
    });

    it("FILE フィールドの type が正しく設定される", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: attachment
        type: FILE
        label: 添付
`;
      const schema = SchemaParser.parse(yaml);
      expect(schema.fields.get("attachment" as FieldCode)?.type).toBe("FILE");
    });

    it("elementId が空文字のデコレーション要素はフィールドに含まれない", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - type: LABEL
        label: テスト
        elementId: ""
        size:
          width: "200"
      - type: SPACER
        elementId: ""
        size:
          width: "100"
`;
      const schema = SchemaParser.parse(yaml);
      expect(schema.fields.size).toBe(0);
      const row = schema.layout[0];
      if (row.type === "ROW") {
        expect(row.fields).toHaveLength(2);
      }
    });

    it("elementId が省略されたデコレーション要素はレイアウト要素として登録される", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - type: LABEL
        label: テスト
`;
      const schema = SchemaParser.parse(yaml);
      expect(schema.fields.size).toBe(0);
      const row = schema.layout[0];
      if (row.type === "ROW") {
        expect(row.fields).toHaveLength(1);
      }
    });

    it("LABEL, SPACER, HR はフィールドに含まれずレイアウト要素として登録される", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - type: LABEL
        label: セクション
        elementId: el1
        size:
          width: "200"
      - type: SPACER
        elementId: el2
        size:
          width: "100"
      - type: HR
        elementId: el3
        size:
          width: "400"
`;
      const schema = SchemaParser.parse(yaml);
      expect(schema.fields.size).toBe(0);
      expect(schema.layout).toHaveLength(1);
      const row = schema.layout[0];
      if (row.type === "ROW") {
        expect(row.fields).toHaveLength(3);
      }
    });

    it("RECORD_NUMBER, CREATOR はフィールドに含まれない", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: RECORD_NUMBER
        type: RECORD_NUMBER
      - code: CREATOR
        type: CREATOR
`;
      const schema = SchemaParser.parse(yaml);
      expect(schema.fields.size).toBe(0);
    });

    it("GROUP レイアウトはグループ自体と内部フィールドの両方がフィールドに登録される", () => {
      const yaml = `
layout:
  - type: GROUP
    code: myGroup
    label: グループ
    openGroup: true
    layout:
      - type: ROW
        fields:
          - code: inner
            type: SINGLE_LINE_TEXT
            label: 内部
`;
      const schema = SchemaParser.parse(yaml);
      expect(schema.fields.size).toBe(2);
      expect(schema.fields.has("myGroup" as FieldCode)).toBe(true);
      expect(schema.fields.has("inner" as FieldCode)).toBe(true);
      const groupDef = schema.fields.get("myGroup" as FieldCode);
      expect(groupDef?.type).toBe("GROUP");
    });

    it("SUBTABLE レイアウトはテーブル自体と内部フィールドがフィールドに登録される", () => {
      const yaml = `
layout:
  - type: SUBTABLE
    code: myTable
    label: テーブル
    fields:
      - code: col1
        type: SINGLE_LINE_TEXT
        label: 列1
      - code: col2
        type: NUMBER
        label: 列2
`;
      const schema = SchemaParser.parse(yaml);
      expect(schema.fields.has("myTable" as FieldCode)).toBe(true);
      expect(schema.fields.has("col1" as FieldCode)).toBe(true);
      expect(schema.fields.has("col2" as FieldCode)).toBe(true);
      const tableDef = schema.fields.get("myTable" as FieldCode);
      expect(tableDef?.type).toBe("SUBTABLE");
      if (tableDef?.type === "SUBTABLE") {
        expect(tableDef.properties.fields.size).toBe(2);
      }
    });

    it("REFERENCE_TABLE の referenceTable プロパティが正しく設定される", () => {
      const yaml = `
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
          filterCond: status = "open"
          sort: col1 asc
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("ref" as FieldCode);
      expect(field?.type).toBe("REFERENCE_TABLE");
      if (field?.type === "REFERENCE_TABLE") {
        const ref = field.properties.referenceTable;
        expect(ref.relatedApp.app).toBe("123");
        expect(String(ref.condition.field)).toBe("key");
        expect(String(ref.condition.relatedField)).toBe("relKey");
        expect(ref.displayFields).toHaveLength(2);
        expect(ref.filterCond).toBe('status = "open"');
        expect(ref.sort).toBe("col1 asc");
      }
    });

    it("noLabel: true が指定されたフィールドは noLabel プロパティを持つ", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: hidden
        type: SINGLE_LINE_TEXT
        label: 非表示ラベル
        noLabel: true
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("hidden" as FieldCode);
      expect(field?.noLabel).toBe(true);
    });

    it("size が指定されたフィールドはレイアウト要素に size が設定される", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: sized
        type: SINGLE_LINE_TEXT
        label: サイズ付き
        size:
          width: "200"
          innerHeight: "100"
`;
      const schema = SchemaParser.parse(yaml);
      const row = schema.layout[0];
      if (row.type === "ROW") {
        const el = row.fields[0];
        if ("field" in el) {
          expect(el.size).toEqual({ width: "200", innerHeight: "100" });
        }
      }
    });
  });

  describe("異常系", () => {
    it("空テキストを渡すと EmptySchemaText エラーが発生する", () => {
      expect(() => SchemaParser.parse("")).toThrow(BusinessRuleError);
      expect(() => SchemaParser.parse("   ")).toThrow(BusinessRuleError);
    });

    it("不正な YAML を渡すと InvalidSchemaJson エラーが発生する", () => {
      expect(() => SchemaParser.parse("{{invalid")).toThrow(BusinessRuleError);
    });

    it("オブジェクト以外のスキーマを渡すと InvalidSchemaStructure エラーが発生する", () => {
      expect(() => SchemaParser.parse('"just a string"')).toThrow(
        BusinessRuleError,
      );
    });

    it("layout キーのないスキーマを渡すと InvalidLayoutStructure エラーが発生する", () => {
      expect(() => SchemaParser.parse("foo: bar")).toThrow(BusinessRuleError);
    });

    it("layout なしで fields のみのスキーマを渡すと InvalidSchemaStructure エラーが発生する", () => {
      const yaml = `
fields:
  name:
    type: SINGLE_LINE_TEXT
`;
      try {
        SchemaParser.parse(yaml);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessRuleError);
        expect((e as BusinessRuleError).code).toBe(
          FormSchemaErrorCode.InvalidSchemaStructure,
        );
      }
    });

    it("未知のフィールド型を渡すと InvalidFieldType エラーが発生する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: bad
        type: UNKNOWN_TYPE
        label: 不正
`;
      try {
        SchemaParser.parse(yaml);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessRuleError);
        expect((e as BusinessRuleError).code).toBe(
          FormSchemaErrorCode.InvalidFieldType,
        );
      }
    });

    it("未知のデコレーション要素型を渡すとエラーが発生する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - type: UNKNOWN_DECORATION
        elementId: el1
`;
      try {
        SchemaParser.parse(yaml);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessRuleError);
      }
    });

    it("同じフィールドコードが重複すると DuplicateFieldCode エラーが発生する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: dup
        type: SINGLE_LINE_TEXT
        label: 一つ目
      - code: dup
        type: NUMBER
        label: 二つ目
`;
      try {
        SchemaParser.parse(yaml);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessRuleError);
        expect((e as BusinessRuleError).code).toBe(
          FormSchemaErrorCode.DuplicateFieldCode,
        );
      }
    });

    it("SUBTABLE 内のフィールドコードがトップレベルと重複すると DuplicateFieldCode エラーが発生する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: shared
        type: SINGLE_LINE_TEXT
        label: トップレベル
  - type: SUBTABLE
    code: table1
    label: テーブル
    fields:
      - code: shared
        type: NUMBER
        label: テーブル内
`;
      try {
        SchemaParser.parse(yaml);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessRuleError);
        expect((e as BusinessRuleError).code).toBe(
          FormSchemaErrorCode.DuplicateFieldCode,
        );
      }
    });

    it("REFERENCE_TABLE で referenceTable プロパティが欠損すると InvalidSchemaStructure エラーが発生する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: ref
        type: REFERENCE_TABLE
        label: 参照テーブル
`;
      try {
        SchemaParser.parse(yaml);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessRuleError);
        expect((e as BusinessRuleError).code).toBe(
          FormSchemaErrorCode.InvalidSchemaStructure,
        );
      }
    });

    it("REFERENCE_TABLE で relatedApp が欠損すると InvalidSchemaStructure エラーが発生する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: ref
        type: REFERENCE_TABLE
        label: 参照テーブル
        referenceTable:
          condition:
            field: key
            relatedField: relKey
          displayFields:
            - col1
`;
      try {
        SchemaParser.parse(yaml);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessRuleError);
        expect((e as BusinessRuleError).code).toBe(
          FormSchemaErrorCode.InvalidSchemaStructure,
        );
      }
    });

    it("REFERENCE_TABLE で condition が欠損すると InvalidSchemaStructure エラーが発生する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: ref
        type: REFERENCE_TABLE
        label: 参照テーブル
        referenceTable:
          relatedApp:
            app: "1"
          displayFields:
            - col1
`;
      try {
        SchemaParser.parse(yaml);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessRuleError);
        expect((e as BusinessRuleError).code).toBe(
          FormSchemaErrorCode.InvalidSchemaStructure,
        );
      }
    });

    it("REFERENCE_TABLE で displayFields が欠損すると InvalidSchemaStructure エラーが発生する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: ref
        type: REFERENCE_TABLE
        label: 参照テーブル
        referenceTable:
          relatedApp:
            app: "1"
          condition:
            field: key
            relatedField: relKey
`;
      try {
        SchemaParser.parse(yaml);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessRuleError);
        expect((e as BusinessRuleError).code).toBe(
          FormSchemaErrorCode.InvalidSchemaStructure,
        );
      }
    });

    it("未知のレイアウトアイテム型を渡すと InvalidLayoutStructure エラーが発生する", () => {
      const yaml = `
layout:
  - type: UNKNOWN
`;
      try {
        SchemaParser.parse(yaml);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessRuleError);
        expect((e as BusinessRuleError).code).toBe(
          FormSchemaErrorCode.InvalidLayoutStructure,
        );
      }
    });

    it("無効な unitPosition を渡すと InvalidSchemaStructure エラーが発生する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: num
        type: NUMBER
        label: 数値
        unitPosition: MIDDLE
`;
      try {
        SchemaParser.parse(yaml);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessRuleError);
        expect((e as BusinessRuleError).code).toBe(
          FormSchemaErrorCode.InvalidSchemaStructure,
        );
      }
    });

    it("空文字のフィールドコードを渡すと EmptyFieldCode エラーが発生する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: ""
        type: SINGLE_LINE_TEXT
        label: テスト
`;
      try {
        SchemaParser.parse(yaml);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessRuleError);
        expect((e as BusinessRuleError).code).toBe(
          FormSchemaErrorCode.EmptyFieldCode,
        );
      }
    });

    it("無効な CALC format を渡すと InvalidSchemaStructure エラーが発生する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: calc
        type: CALC
        label: 計算
        expression: a + b
        format: INVALID_FORMAT
`;
      try {
        SchemaParser.parse(yaml);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessRuleError);
        expect((e as BusinessRuleError).code).toBe(
          FormSchemaErrorCode.InvalidSchemaStructure,
        );
      }
    });

    it("無効な align を渡すと InvalidSchemaStructure エラーが発生する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: cb
        type: CHECK_BOX
        label: チェック
        options:
          A: { label: A, index: "0" }
        align: DIAGONAL
`;
      try {
        SchemaParser.parse(yaml);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessRuleError);
        expect((e as BusinessRuleError).code).toBe(
          FormSchemaErrorCode.InvalidSchemaStructure,
        );
      }
    });

    it("無効な LINK protocol を渡すと InvalidSchemaStructure エラーが発生する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: lnk
        type: LINK
        label: リンク
        protocol: FTP
`;
      try {
        SchemaParser.parse(yaml);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessRuleError);
        expect((e as BusinessRuleError).code).toBe(
          FormSchemaErrorCode.InvalidSchemaStructure,
        );
      }
    });

    it("CALC の unitPosition に無効な値を渡すと InvalidSchemaStructure エラーが発生する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: calc
        type: CALC
        label: 計算
        expression: a + b
        format: NUMBER
        unitPosition: MIDDLE
`;
      try {
        SchemaParser.parse(yaml);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessRuleError);
        expect((e as BusinessRuleError).code).toBe(
          FormSchemaErrorCode.InvalidSchemaStructure,
        );
      }
    });

    it("GROUP 内のレイアウト行が ROW 以外の場合、InvalidLayoutStructure エラーが発生する", () => {
      const yaml = `
layout:
  - type: GROUP
    code: grp
    label: グループ
    layout:
      - type: INVALID_ROW
        fields: []
`;
      try {
        SchemaParser.parse(yaml);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessRuleError);
        expect((e as BusinessRuleError).code).toBe(
          FormSchemaErrorCode.InvalidLayoutStructure,
        );
      }
    });

    it("layout が配列でない場合、InvalidLayoutStructure エラーが発生する", () => {
      const yaml = `
layout:
  foo: bar
`;
      try {
        SchemaParser.parse(yaml);
        expect.unreachable("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessRuleError);
        expect((e as BusinessRuleError).code).toBe(
          FormSchemaErrorCode.InvalidLayoutStructure,
        );
      }
    });

    it("REFERENCE_TABLE の size が数値で指定された場合、文字列に正規化される", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: ref
        type: REFERENCE_TABLE
        label: 参照
        referenceTable:
          relatedApp: { app: "1" }
          condition: { field: key, relatedField: rKey }
          displayFields: [col1]
          size: 5
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("ref" as FieldCode);
      if (field?.type === "REFERENCE_TABLE") {
        expect(field.properties.referenceTable.size).toBe("5");
      }
    });
  });

  describe("kintone API型アライメント", () => {
    it("SINGLE_LINE_TEXT は required, unique, defaultValue, minLength, maxLength, expression を保持する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: text
        type: SINGLE_LINE_TEXT
        label: テキスト
        required: true
        unique: true
        defaultValue: 初期値
        minLength: "1"
        maxLength: "100"
        expression: customer_name & " - " & order_number
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("text" as FieldCode);
      expect(field?.type).toBe("SINGLE_LINE_TEXT");
      expect(field?.properties).toEqual({
        required: true,
        unique: true,
        defaultValue: "初期値",
        minLength: "1",
        maxLength: "100",
        expression: 'customer_name & " - " & order_number',
      });
    });

    it("MULTI_LINE_TEXT は required, defaultValue, minLength, maxLength を保持する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: memo
        type: MULTI_LINE_TEXT
        label: メモ
        required: true
        defaultValue: ここに入力
        minLength: "10"
        maxLength: "5000"
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("memo" as FieldCode);
      expect(field?.type).toBe("MULTI_LINE_TEXT");
      expect(field?.properties).toEqual({
        required: true,
        defaultValue: "ここに入力",
        minLength: "10",
        maxLength: "5000",
      });
    });

    it("RICH_TEXT は required と defaultValue を保持する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: rich
        type: RICH_TEXT
        label: リッチ
        required: true
        defaultValue: "<p>初期</p>"
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("rich" as FieldCode);
      expect(field?.type).toBe("RICH_TEXT");
      expect(field?.properties).toEqual({
        required: true,
        defaultValue: "<p>初期</p>",
      });
    });

    it("NUMBER は required, unique, defaultValue, minValue, maxValue, digit, displayScale, unit, unitPosition を保持する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: price
        type: NUMBER
        label: 金額
        required: true
        unique: true
        defaultValue: "0"
        minValue: "0"
        maxValue: "99999999"
        digit: true
        displayScale: "2"
        unit: 円
        unitPosition: AFTER
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("price" as FieldCode);
      expect(field?.type).toBe("NUMBER");
      expect(field?.properties).toEqual({
        required: true,
        unique: true,
        defaultValue: "0",
        minValue: "0",
        maxValue: "99999999",
        digit: true,
        displayScale: "2",
        unit: "円",
        unitPosition: "AFTER",
      });
    });

    it("NUMBER の unitPosition に BEFORE を指定すると通貨記号が前置される設定になる", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: usd
        type: NUMBER
        label: USD
        unit: $
        unitPosition: BEFORE
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("usd" as FieldCode);
      expect(field?.properties).toEqual({
        unit: "$",
        unitPosition: "BEFORE",
      });
    });

    it("CALC は expression, format, displayScale, unit, unitPosition, hideExpression を保持する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: total
        type: CALC
        label: 合計
        expression: price * quantity
        format: NUMBER
        displayScale: "0"
        unit: 円
        unitPosition: AFTER
        hideExpression: true
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("total" as FieldCode);
      expect(field?.type).toBe("CALC");
      expect(field?.properties).toEqual({
        expression: "price * quantity",
        format: "NUMBER",
        displayScale: "0",
        unit: "円",
        unitPosition: "AFTER",
        hideExpression: true,
      });
    });

    it.each([
      "NUMBER",
      "NUMBER_DIGIT",
      "DATE",
      "TIME",
      "DATETIME",
      "HOUR_MINUTE",
      "DAY_HOUR_MINUTE",
    ] as const)("CALC の format に %s を指定すると対応する表示形式になる", (format) => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: calc_${format.toLowerCase()}
        type: CALC
        label: 計算
        expression: a
        format: ${format}
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get(
        `calc_${format.toLowerCase()}` as FieldCode,
      );
      expect(field?.type).toBe("CALC");
      if (field?.type === "CALC") {
        expect(field.properties.format).toBe(format);
      }
    });

    it("CHECK_BOX は required, defaultValue, options, align を保持する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: categories
        type: CHECK_BOX
        label: カテゴリ
        required: true
        defaultValue:
          - A
        options:
          A: { label: カテゴリA, index: "0" }
          B: { label: カテゴリB, index: "1" }
        align: HORIZONTAL
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("categories" as FieldCode);
      expect(field?.type).toBe("CHECK_BOX");
      if (field?.type === "CHECK_BOX") {
        expect(field.properties.required).toBe(true);
        expect(field.properties.defaultValue).toEqual(["A"]);
        expect(field.properties.options).toEqual({
          A: { label: "カテゴリA", index: "0" },
          B: { label: "カテゴリB", index: "1" },
        });
        expect(field.properties.align).toBe("HORIZONTAL");
      }
    });

    it("RADIO_BUTTON は required, defaultValue, options, align を保持する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: priority
        type: RADIO_BUTTON
        label: 優先度
        required: true
        defaultValue:
          - 中
        options:
          高: { label: 高, index: "0" }
          中: { label: 中, index: "1" }
          低: { label: 低, index: "2" }
        align: VERTICAL
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("priority" as FieldCode);
      expect(field?.type).toBe("RADIO_BUTTON");
      if (field?.type === "RADIO_BUTTON") {
        expect(field.properties.required).toBe(true);
        expect(field.properties.defaultValue).toEqual(["中"]);
        expect(field.properties.align).toBe("VERTICAL");
        expect(Object.keys(field.properties.options)).toHaveLength(3);
      }
    });

    it("MULTI_SELECT は defaultValue に空配列を指定すると初期選択なしになる", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: skills
        type: MULTI_SELECT
        label: スキル
        required: false
        defaultValue: []
        options:
          JS: { label: JavaScript, index: "0" }
          TS: { label: TypeScript, index: "1" }
        align: HORIZONTAL
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("skills" as FieldCode);
      expect(field?.type).toBe("MULTI_SELECT");
      if (field?.type === "MULTI_SELECT") {
        expect(field.properties.defaultValue).toEqual([]);
        expect(field.properties.align).toBe("HORIZONTAL");
      }
    });

    it("DROP_DOWN は required, defaultValue, options を保持する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: status
        type: DROP_DOWN
        label: ステータス
        required: true
        defaultValue:
          - 未着手
        options:
          未着手: { label: 未着手, index: "0" }
          完了: { label: 完了, index: "1" }
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("status" as FieldCode);
      expect(field?.type).toBe("DROP_DOWN");
      if (field?.type === "DROP_DOWN") {
        expect(field.properties.required).toBe(true);
        expect(field.properties.defaultValue).toEqual(["未着手"]);
        expect(field.properties.options).toEqual({
          未着手: { label: "未着手", index: "0" },
          完了: { label: "完了", index: "1" },
        });
      }
    });

    it("DATE は required, unique, defaultValue, defaultNowValue を保持する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: due
        type: DATE
        label: 期限
        required: true
        unique: true
        defaultValue: "2025-01-01"
        defaultNowValue: false
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("due" as FieldCode);
      expect(field?.type).toBe("DATE");
      if (field?.type === "DATE") {
        expect(field.properties).toEqual({
          required: true,
          unique: true,
          defaultValue: "2025-01-01",
          defaultNowValue: false,
        });
      }
    });

    it("DATE の defaultNowValue に true を指定すると現在日付が初期値になる", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: today
        type: DATE
        label: 今日
        defaultNowValue: true
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("today" as FieldCode);
      if (field?.type === "DATE") {
        expect(field.properties.defaultNowValue).toBe(true);
      }
    });

    it("TIME は required, defaultValue, defaultNowValue を保持する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: start
        type: TIME
        label: 開始
        required: true
        defaultValue: "09:00"
        defaultNowValue: false
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("start" as FieldCode);
      expect(field?.type).toBe("TIME");
      if (field?.type === "TIME") {
        expect(field.properties).toEqual({
          required: true,
          defaultValue: "09:00",
          defaultNowValue: false,
        });
      }
    });

    it("DATETIME は required, unique, defaultNowValue を保持する", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: created
        type: DATETIME
        label: 作成日時
        required: true
        unique: true
        defaultNowValue: true
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("created" as FieldCode);
      expect(field?.type).toBe("DATETIME");
      if (field?.type === "DATETIME") {
        expect(field.properties).toEqual({
          required: true,
          unique: true,
          defaultNowValue: true,
        });
      }
    });

    it.each([
      "WEB",
      "CALL",
      "MAIL",
    ] as const)("LINK の protocol に %s を指定すると対応するリンク種別になる", (protocol) => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: lnk
        type: LINK
        label: リンク
        required: true
        unique: true
        defaultValue: test
        minLength: "1"
        maxLength: "500"
        protocol: ${protocol}
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("lnk" as FieldCode);
      expect(field?.type).toBe("LINK");
      if (field?.type === "LINK") {
        expect(field.properties.protocol).toBe(protocol);
        expect(field.properties.required).toBe(true);
        expect(field.properties.unique).toBe(true);
        expect(field.properties.minLength).toBe("1");
        expect(field.properties.maxLength).toBe("500");
      }
    });

    it("USER_SELECT の defaultValue に code/type 配列を指定すると初期ユーザーが設定される", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: assignee
        type: USER_SELECT
        label: 担当者
        required: true
        defaultValue:
          - { code: admin, type: USER }
          - { code: dev-team, type: GROUP }
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("assignee" as FieldCode);
      expect(field?.type).toBe("USER_SELECT");
      if (field?.type === "USER_SELECT") {
        expect(field.properties.required).toBe(true);
        expect(field.properties.defaultValue).toEqual([
          { code: "admin", type: "USER" },
          { code: "dev-team", type: "GROUP" },
        ]);
      }
    });

    it("ORGANIZATION_SELECT の defaultValue に組織を指定すると初期組織が設定される", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: dept
        type: ORGANIZATION_SELECT
        label: 部署
        required: true
        defaultValue:
          - { code: engineering, type: ORGANIZATION }
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("dept" as FieldCode);
      expect(field?.type).toBe("ORGANIZATION_SELECT");
      if (field?.type === "ORGANIZATION_SELECT") {
        expect(field.properties.defaultValue).toEqual([
          { code: "engineering", type: "ORGANIZATION" },
        ]);
      }
    });

    it("GROUP_SELECT の defaultValue にグループを指定すると初期グループが設定される", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: team
        type: GROUP_SELECT
        label: チーム
        defaultValue:
          - { code: dev-team, type: GROUP }
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("team" as FieldCode);
      expect(field?.type).toBe("GROUP_SELECT");
      if (field?.type === "GROUP_SELECT") {
        expect(field.properties.defaultValue).toEqual([
          { code: "dev-team", type: "GROUP" },
        ]);
      }
    });

    it("FILE の thumbnailSize を指定するとサムネイルサイズが設定される", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: file
        type: FILE
        label: ファイル
        required: true
        thumbnailSize: "250"
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("file" as FieldCode);
      expect(field?.type).toBe("FILE");
      if (field?.type === "FILE") {
        expect(field.properties.required).toBe(true);
        expect(field.properties.thumbnailSize).toBe("250");
      }
    });

    it("REFERENCE_TABLE の size を指定すると表示件数が設定される", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: ref
        type: REFERENCE_TABLE
        label: 関連
        referenceTable:
          relatedApp: { app: "42" }
          condition: { field: key, relatedField: rKey }
          displayFields: [col1]
          filterCond: 'status = "active"'
          sort: col1 asc
          size: "10"
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("ref" as FieldCode);
      expect(field?.type).toBe("REFERENCE_TABLE");
      if (field?.type === "REFERENCE_TABLE") {
        const ref = field.properties.referenceTable;
        expect(ref.size).toBe("10");
        expect(ref.filterCond).toBe('status = "active"');
        expect(ref.sort).toBe("col1 asc");
      }
    });

    it("SUBTABLE 内フィールドのプロパティが各フィールド型に応じて保持される", () => {
      const yaml = `
layout:
  - type: SUBTABLE
    code: items
    label: 明細
    fields:
      - code: name
        type: SINGLE_LINE_TEXT
        label: 品名
        required: true
        maxLength: "200"
      - code: qty
        type: NUMBER
        label: 数量
        minValue: "1"
        digit: false
      - code: sub_calc
        type: CALC
        label: 小計
        expression: qty * price
        format: NUMBER
        displayScale: "0"
`;
      const schema = SchemaParser.parse(yaml);
      const tableDef = schema.fields.get("items" as FieldCode);
      expect(tableDef?.type).toBe("SUBTABLE");
      if (tableDef?.type === "SUBTABLE") {
        const nameField = tableDef.properties.fields.get("name" as FieldCode);
        expect(nameField?.properties).toEqual({
          required: true,
          maxLength: "200",
        });

        const qtyField = tableDef.properties.fields.get("qty" as FieldCode);
        expect(qtyField?.properties).toEqual({
          minValue: "1",
          digit: false,
        });

        const calcField = tableDef.properties.fields.get(
          "sub_calc" as FieldCode,
        );
        expect(calcField?.type).toBe("CALC");
        if (calcField?.type === "CALC") {
          expect(calcField.properties.expression).toBe("qty * price");
          expect(calcField.properties.format).toBe("NUMBER");
          expect(calcField.properties.displayScale).toBe("0");
        }
      }
    });

    it("YAML 上で数値として記述されたプロパティ値は文字列に正規化される", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: num
        type: NUMBER
        label: 数値
        minValue: 0
        maxValue: 100
        displayScale: 2
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("num" as FieldCode);
      if (field?.type === "NUMBER") {
        expect(field.properties.minValue).toBe("0");
        expect(field.properties.maxValue).toBe("100");
        expect(field.properties.displayScale).toBe("2");
      }
    });

    it("GROUP の openGroup に false を指定するとデフォルトで折りたたまれる", () => {
      const yaml = `
layout:
  - type: GROUP
    code: grp
    label: グループ
    openGroup: false
    layout:
      - type: ROW
        fields:
          - code: inner
            type: SINGLE_LINE_TEXT
            label: 内部
`;
      const schema = SchemaParser.parse(yaml);
      const groupDef = schema.fields.get("grp" as FieldCode);
      expect(groupDef?.type).toBe("GROUP");
      if (groupDef?.type === "GROUP") {
        expect(groupDef.properties.openGroup).toBe(false);
      }
    });

    it("SUBTABLE に noLabel を指定すると noLabel プロパティを持つ", () => {
      const yaml = `
layout:
  - type: SUBTABLE
    code: items
    label: 明細
    noLabel: true
    fields:
      - code: col1
        type: SINGLE_LINE_TEXT
        label: 列1
`;
      const schema = SchemaParser.parse(yaml);
      const subtableItem = schema.layout[0];
      expect(subtableItem.type).toBe("SUBTABLE");
      if (subtableItem.type === "SUBTABLE") {
        expect(subtableItem.noLabel).toBe(true);
      }
    });

    it("GROUP に noLabel を指定すると noLabel プロパティを持つ", () => {
      const yaml = `
layout:
  - type: GROUP
    code: grp
    label: グループ
    noLabel: true
    openGroup: false
    layout:
      - type: ROW
        fields:
          - code: inner
            type: SINGLE_LINE_TEXT
            label: 内部
`;
      const schema = SchemaParser.parse(yaml);
      const groupItem = schema.layout[0];
      expect(groupItem.type).toBe("GROUP");
      if (groupItem.type === "GROUP") {
        expect(groupItem.noLabel).toBe(true);
        expect(groupItem.openGroup).toBe(false);
      }
      const groupDef = schema.fields.get("grp" as FieldCode);
      expect(groupDef?.noLabel).toBe(true);
    });

    it("RECORD_NUMBER にサイズを指定するとシステムフィールドとして size 付きで登録される", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: RECORD_NUMBER
        type: RECORD_NUMBER
        size:
          width: "100"
`;
      const schema = SchemaParser.parse(yaml);
      expect(schema.fields.size).toBe(0);
      const row = schema.layout[0];
      if (row.type === "ROW") {
        const el = row.fields[0];
        expect("code" in el).toBe(true);
        if ("code" in el && !("field" in el)) {
          expect(el.type).toBe("RECORD_NUMBER");
          expect(el.size).toEqual({ width: "100" });
        }
      }
    });

    it("フィールドの size にサイズ指定がない場合は size が undefined になる", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: name
        type: SINGLE_LINE_TEXT
        label: 名前
`;
      const schema = SchemaParser.parse(yaml);
      const row = schema.layout[0];
      if (row.type === "ROW") {
        const el = row.fields[0];
        if ("field" in el) {
          expect(el.size).toBeUndefined();
        }
      }
    });

    it("ROW 内に SUBTABLE フィールドをフラット定義した場合、内部フィールド付きの SUBTABLE 定義が生成される", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: flatTable
        type: SUBTABLE
        label: フラットテーブル
        fields:
          - code: inner1
            type: SINGLE_LINE_TEXT
            label: 内部フィールド1
          - code: inner2
            type: NUMBER
            label: 内部フィールド2
`;
      const schema = SchemaParser.parse(yaml);
      const field = schema.fields.get("flatTable" as FieldCode);
      expect(field).toBeDefined();
      expect(field?.type).toBe("SUBTABLE");
      if (field?.type === "SUBTABLE") {
        expect(field.properties.fields.size).toBe(2);
        expect(field.properties.fields.get("inner1" as FieldCode)?.type).toBe(
          "SINGLE_LINE_TEXT",
        );
        expect(field.properties.fields.get("inner2" as FieldCode)?.type).toBe(
          "NUMBER",
        );
      }
    });

    it("ROW 内に GROUP フィールドをフラット定義した場合、GROUP 型のフィールド定義が生成される", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: flatGroup
        type: GROUP
        label: フラットグループ
`;
      const schema = SchemaParser.parse(yaml);
      expect(schema.fields.size).toBe(1);
      const field = schema.fields.get("flatGroup" as FieldCode);
      expect(field).toBeDefined();
      expect(field?.type).toBe("GROUP");
      expect(field?.label).toBe("フラットグループ");
    });

    it("全20フィールドタイプを含むスキーマが正しくフィールド登録される", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: f1
        type: SINGLE_LINE_TEXT
        label: f1
      - code: f2
        type: MULTI_LINE_TEXT
        label: f2
      - code: f3
        type: RICH_TEXT
        label: f3
      - code: f4
        type: NUMBER
        label: f4
      - code: f5
        type: CALC
        label: f5
        expression: f4
      - code: f6
        type: CHECK_BOX
        label: f6
        options:
          A: { label: A, index: "0" }
      - code: f7
        type: RADIO_BUTTON
        label: f7
        options:
          A: { label: A, index: "0" }
      - code: f8
        type: MULTI_SELECT
        label: f8
        options:
          A: { label: A, index: "0" }
      - code: f9
        type: DROP_DOWN
        label: f9
        options:
          A: { label: A, index: "0" }
      - code: f10
        type: DATE
        label: f10
      - code: f11
        type: TIME
        label: f11
      - code: f12
        type: DATETIME
        label: f12
      - code: f13
        type: LINK
        label: f13
      - code: f14
        type: USER_SELECT
        label: f14
      - code: f15
        type: ORGANIZATION_SELECT
        label: f15
      - code: f16
        type: GROUP_SELECT
        label: f16
      - code: f17
        type: FILE
        label: f17
      - code: f18
        type: REFERENCE_TABLE
        label: f18
        referenceTable:
          relatedApp: { app: "1" }
          condition: { field: key, relatedField: rKey }
          displayFields: [col1]
  - type: GROUP
    code: g1
    label: グループ
    layout: []
  - type: SUBTABLE
    code: t1
    label: テーブル
    fields:
      - code: tc1
        type: SINGLE_LINE_TEXT
        label: tc1
`;
      const schema = SchemaParser.parse(yaml);
      // 18 top-level fields + 1 GROUP + 1 SUBTABLE + 1 subtable inner field
      expect(schema.fields.size).toBe(21);

      const types = [...schema.fields.values()].map((f) => f.type);
      expect(types).toContain("SINGLE_LINE_TEXT");
      expect(types).toContain("MULTI_LINE_TEXT");
      expect(types).toContain("RICH_TEXT");
      expect(types).toContain("NUMBER");
      expect(types).toContain("CALC");
      expect(types).toContain("CHECK_BOX");
      expect(types).toContain("RADIO_BUTTON");
      expect(types).toContain("MULTI_SELECT");
      expect(types).toContain("DROP_DOWN");
      expect(types).toContain("DATE");
      expect(types).toContain("TIME");
      expect(types).toContain("DATETIME");
      expect(types).toContain("LINK");
      expect(types).toContain("USER_SELECT");
      expect(types).toContain("ORGANIZATION_SELECT");
      expect(types).toContain("GROUP_SELECT");
      expect(types).toContain("FILE");
      expect(types).toContain("REFERENCE_TABLE");
      expect(types).toContain("GROUP");
      expect(types).toContain("SUBTABLE");
    });
  });
});
