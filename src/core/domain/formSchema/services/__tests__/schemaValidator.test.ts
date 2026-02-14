import { describe, expect, it } from "vitest";
import type { Schema } from "../../entity";
import type {
  CalcFieldDefinition,
  FieldCode,
  FieldDefinition,
  FileFieldDefinition,
  LinkFieldDefinition,
  MultiValueSelectionFieldDefinition,
  NumberFieldDefinition,
  ReferenceTableFieldDefinition,
  SingleLineTextFieldDefinition,
  SingleValueSelectionFieldDefinition,
  SubtableFieldDefinition,
} from "../../valueObject";
import { SchemaValidator } from "../schemaValidator";

function createSchema(fields: readonly FieldDefinition[]): Schema {
  const fieldMap = new Map<FieldCode, FieldDefinition>();
  for (const f of fields) {
    fieldMap.set(f.code, f);
  }
  return { fields: fieldMap, layout: [] };
}

function textField(code: string, label: string): SingleLineTextFieldDefinition {
  return {
    code: code as FieldCode,
    type: "SINGLE_LINE_TEXT",
    label,
    properties: {},
  };
}

describe("SchemaValidator", () => {
  describe("validateLabelNonEmpty", () => {
    it("label が空文字のフィールドはエラーになる", () => {
      const field = textField("name", "");
      const result = SchemaValidator.validate(createSchema([field]));
      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].rule).toBe("EMPTY_LABEL");
    });

    it("label がスペースのみのフィールドはエラーになる", () => {
      const field = textField("name", "   ");
      const result = SchemaValidator.validate(createSchema([field]));
      expect(result.isValid).toBe(false);
      expect(result.issues[0].rule).toBe("EMPTY_LABEL");
    });

    it("label が非空のフィールドはエラーにならない", () => {
      const field = textField("name", "名前");
      const result = SchemaValidator.validate(createSchema([field]));
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe("validateSelectionOptions", () => {
    it.each([
      "CHECK_BOX",
      "RADIO_BUTTON",
      "MULTI_SELECT",
      "DROP_DOWN",
    ])("%s で options が空オブジェクトの場合エラーになる", (type) => {
      const field = {
        code: "sel" as FieldCode,
        type,
        label: "選択",
        properties: { options: {} },
      } as FieldDefinition;
      const result = SchemaValidator.validate(createSchema([field]));
      expect(result.isValid).toBe(false);
      expect(result.issues.some((i) => i.rule === "EMPTY_OPTIONS")).toBe(true);
    });

    it("CHECK_BOX で options がある場合エラーにならない", () => {
      const field: MultiValueSelectionFieldDefinition = {
        code: "cb" as FieldCode,
        type: "CHECK_BOX",
        label: "チェック",
        properties: {
          options: { A: { label: "A", index: "0" } },
        },
      };
      const result = SchemaValidator.validate(createSchema([field]));
      expect(
        result.issues.filter((i) => i.rule === "EMPTY_OPTIONS"),
      ).toHaveLength(0);
    });
  });

  describe("validateSelectionOptionStructure", () => {
    it("option に label が欠損している場合エラーになる", () => {
      const field = {
        code: "sel" as FieldCode,
        type: "DROP_DOWN",
        label: "選択",
        properties: {
          options: { A: { index: "0" } },
        },
      } as unknown as SingleValueSelectionFieldDefinition;
      const result = SchemaValidator.validate(createSchema([field]));
      expect(
        result.issues.some(
          (i) =>
            i.rule === "INVALID_OPTION_STRUCTURE" &&
            i.message.includes("label"),
        ),
      ).toBe(true);
    });

    it("option に index が欠損している場合エラーになる", () => {
      const field = {
        code: "sel" as FieldCode,
        type: "DROP_DOWN",
        label: "選択",
        properties: {
          options: { A: { label: "A" } },
        },
      } as unknown as SingleValueSelectionFieldDefinition;
      const result = SchemaValidator.validate(createSchema([field]));
      expect(
        result.issues.some(
          (i) =>
            i.rule === "INVALID_OPTION_STRUCTURE" &&
            i.message.includes("index"),
        ),
      ).toBe(true);
    });

    it("option に label と index がある場合エラーにならない", () => {
      const field: SingleValueSelectionFieldDefinition = {
        code: "sel" as FieldCode,
        type: "DROP_DOWN",
        label: "選択",
        properties: {
          options: { A: { label: "A", index: "0" } },
        },
      };
      const result = SchemaValidator.validate(createSchema([field]));
      expect(
        result.issues.filter((i) => i.rule === "INVALID_OPTION_STRUCTURE"),
      ).toHaveLength(0);
    });
  });

  describe("validateCalcExpression", () => {
    it("CALC フィールドで expression が空の場合エラーになる", () => {
      const field: CalcFieldDefinition = {
        code: "calc" as FieldCode,
        type: "CALC",
        label: "計算",
        properties: { expression: "" },
      };
      const result = SchemaValidator.validate(createSchema([field]));
      expect(result.isValid).toBe(false);
      expect(result.issues[0].rule).toBe("EMPTY_EXPRESSION");
    });

    it("CALC フィールドで expression がスペースのみの場合エラーになる", () => {
      const field: CalcFieldDefinition = {
        code: "calc" as FieldCode,
        type: "CALC",
        label: "計算",
        properties: { expression: "   " },
      };
      const result = SchemaValidator.validate(createSchema([field]));
      expect(result.issues[0].rule).toBe("EMPTY_EXPRESSION");
    });

    it("CALC フィールドで expression が非空の場合エラーにならない", () => {
      const field: CalcFieldDefinition = {
        code: "calc" as FieldCode,
        type: "CALC",
        label: "計算",
        properties: { expression: "a + b" },
      };
      const result = SchemaValidator.validate(createSchema([field]));
      expect(
        result.issues.filter((i) => i.rule === "EMPTY_EXPRESSION"),
      ).toHaveLength(0);
    });
  });

  describe("validateLinkProtocol", () => {
    it("LINK フィールドで protocol がない場合 warning になる", () => {
      const field: LinkFieldDefinition = {
        code: "lnk" as FieldCode,
        type: "LINK",
        label: "リンク",
        properties: {},
      };
      const result = SchemaValidator.validate(createSchema([field]));
      expect(result.isValid).toBe(true); // warning only
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].rule).toBe("MISSING_PROTOCOL");
      expect(result.issues[0].severity).toBe("warning");
    });

    it("LINK フィールドで protocol がある場合 warning にならない", () => {
      const field: LinkFieldDefinition = {
        code: "lnk" as FieldCode,
        type: "LINK",
        label: "リンク",
        properties: { protocol: "WEB" },
      };
      const result = SchemaValidator.validate(createSchema([field]));
      expect(
        result.issues.filter((i) => i.rule === "MISSING_PROTOCOL"),
      ).toHaveLength(0);
    });
  });

  describe("validateFileThumbnailSize", () => {
    it.each([
      "50",
      "150",
      "250",
      "500",
    ])("thumbnailSize が %s の場合エラーにならない", (size) => {
      const field: FileFieldDefinition = {
        code: "file" as FieldCode,
        type: "FILE",
        label: "ファイル",
        properties: { thumbnailSize: size },
      };
      const result = SchemaValidator.validate(createSchema([field]));
      expect(
        result.issues.filter((i) => i.rule === "INVALID_THUMBNAIL_SIZE"),
      ).toHaveLength(0);
    });

    it("thumbnailSize が無効な値の場合エラーになる", () => {
      const field: FileFieldDefinition = {
        code: "file" as FieldCode,
        type: "FILE",
        label: "ファイル",
        properties: { thumbnailSize: "100" },
      };
      const result = SchemaValidator.validate(createSchema([field]));
      expect(result.isValid).toBe(false);
      expect(result.issues[0].rule).toBe("INVALID_THUMBNAIL_SIZE");
    });

    it("thumbnailSize が未指定の場合エラーにならない", () => {
      const field: FileFieldDefinition = {
        code: "file" as FieldCode,
        type: "FILE",
        label: "ファイル",
        properties: {},
      };
      const result = SchemaValidator.validate(createSchema([field]));
      expect(
        result.issues.filter((i) => i.rule === "INVALID_THUMBNAIL_SIZE"),
      ).toHaveLength(0);
    });
  });

  describe("validateReferenceTableSize", () => {
    it.each([
      "1",
      "3",
      "5",
      "10",
      "20",
      "30",
      "40",
      "50",
    ])("referenceTable.size が %s の場合エラーにならない", (size) => {
      const field: ReferenceTableFieldDefinition = {
        code: "ref" as FieldCode,
        type: "REFERENCE_TABLE",
        label: "参照",
        properties: {
          referenceTable: {
            relatedApp: { app: "1" },
            condition: {
              field: "key" as FieldCode,
              relatedField: "rKey" as FieldCode,
            },
            displayFields: ["col1" as FieldCode],
            size,
          },
        },
      };
      const result = SchemaValidator.validate(createSchema([field]));
      expect(
        result.issues.filter((i) => i.rule === "INVALID_REFERENCE_TABLE_SIZE"),
      ).toHaveLength(0);
    });

    it("referenceTable.size が無効な値の場合エラーになる", () => {
      const field: ReferenceTableFieldDefinition = {
        code: "ref" as FieldCode,
        type: "REFERENCE_TABLE",
        label: "参照",
        properties: {
          referenceTable: {
            relatedApp: { app: "1" },
            condition: {
              field: "key" as FieldCode,
              relatedField: "rKey" as FieldCode,
            },
            displayFields: ["col1" as FieldCode],
            size: "7",
          },
        },
      };
      const result = SchemaValidator.validate(createSchema([field]));
      expect(result.isValid).toBe(false);
      expect(
        result.issues.some((i) => i.rule === "INVALID_REFERENCE_TABLE_SIZE"),
      ).toBe(true);
    });

    it("referenceTable.size が未指定の場合エラーにならない", () => {
      const field: ReferenceTableFieldDefinition = {
        code: "ref" as FieldCode,
        type: "REFERENCE_TABLE",
        label: "参照",
        properties: {
          referenceTable: {
            relatedApp: { app: "1" },
            condition: {
              field: "key" as FieldCode,
              relatedField: "rKey" as FieldCode,
            },
            displayFields: ["col1" as FieldCode],
          },
        },
      };
      const result = SchemaValidator.validate(createSchema([field]));
      expect(
        result.issues.filter((i) => i.rule === "INVALID_REFERENCE_TABLE_SIZE"),
      ).toHaveLength(0);
    });
  });

  describe("validateLookupStructure", () => {
    it("lookup で relatedApp.app が空の場合エラーになる", () => {
      const field: SingleLineTextFieldDefinition = {
        code: "text" as FieldCode,
        type: "SINGLE_LINE_TEXT",
        label: "テキスト",
        properties: {
          lookup: {
            relatedApp: { app: "" },
            relatedKeyField: "key",
            fieldMappings: [],
            lookupPickerFields: [],
          },
        },
      };
      const result = SchemaValidator.validate(createSchema([field]));
      expect(result.isValid).toBe(false);
      expect(
        result.issues.some(
          (i) =>
            i.rule === "INVALID_LOOKUP" && i.message.includes("relatedApp.app"),
        ),
      ).toBe(true);
    });

    it("lookup で relatedKeyField が空の場合エラーになる", () => {
      const field: SingleLineTextFieldDefinition = {
        code: "text" as FieldCode,
        type: "SINGLE_LINE_TEXT",
        label: "テキスト",
        properties: {
          lookup: {
            relatedApp: { app: "1" },
            relatedKeyField: "",
            fieldMappings: [],
            lookupPickerFields: [],
          },
        },
      };
      const result = SchemaValidator.validate(createSchema([field]));
      expect(result.isValid).toBe(false);
      expect(
        result.issues.some(
          (i) =>
            i.rule === "INVALID_LOOKUP" &&
            i.message.includes("relatedKeyField"),
        ),
      ).toBe(true);
    });

    it("lookup が正しい場合エラーにならない", () => {
      const field: SingleLineTextFieldDefinition = {
        code: "text" as FieldCode,
        type: "SINGLE_LINE_TEXT",
        label: "テキスト",
        properties: {
          lookup: {
            relatedApp: { app: "1" },
            relatedKeyField: "key",
            fieldMappings: [],
            lookupPickerFields: [],
          },
        },
      };
      const result = SchemaValidator.validate(createSchema([field]));
      expect(
        result.issues.filter((i) => i.rule === "INVALID_LOOKUP"),
      ).toHaveLength(0);
    });

    it("NUMBER フィールドの lookup も検証される", () => {
      const field: NumberFieldDefinition = {
        code: "num" as FieldCode,
        type: "NUMBER",
        label: "数値",
        properties: {
          lookup: {
            relatedApp: { app: "" },
            relatedKeyField: "",
            fieldMappings: [],
            lookupPickerFields: [],
          },
        },
      };
      const result = SchemaValidator.validate(createSchema([field]));
      expect(
        result.issues.filter((i) => i.rule === "INVALID_LOOKUP"),
      ).toHaveLength(2);
    });

    it("lookup がない場合はスキップされる", () => {
      const field: SingleLineTextFieldDefinition = {
        code: "text" as FieldCode,
        type: "SINGLE_LINE_TEXT",
        label: "テキスト",
        properties: {},
      };
      const result = SchemaValidator.validate(createSchema([field]));
      expect(
        result.issues.filter((i) => i.rule === "INVALID_LOOKUP"),
      ).toHaveLength(0);
    });
  });

  describe("validateReferenceTableRelatedApp", () => {
    it("referenceTable.relatedApp.app が空文字の場合エラーになる", () => {
      const field: ReferenceTableFieldDefinition = {
        code: "ref" as FieldCode,
        type: "REFERENCE_TABLE",
        label: "参照",
        properties: {
          referenceTable: {
            relatedApp: { app: "" },
            condition: {
              field: "key" as FieldCode,
              relatedField: "rKey" as FieldCode,
            },
            displayFields: ["col1" as FieldCode],
          },
        },
      };
      const result = SchemaValidator.validate(createSchema([field]));
      expect(result.isValid).toBe(false);
      expect(result.issues.some((i) => i.rule === "EMPTY_RELATED_APP")).toBe(
        true,
      );
    });

    it("referenceTable.relatedApp.app が非空の場合エラーにならない", () => {
      const field: ReferenceTableFieldDefinition = {
        code: "ref" as FieldCode,
        type: "REFERENCE_TABLE",
        label: "参照",
        properties: {
          referenceTable: {
            relatedApp: { app: "1" },
            condition: {
              field: "key" as FieldCode,
              relatedField: "rKey" as FieldCode,
            },
            displayFields: ["col1" as FieldCode],
          },
        },
      };
      const result = SchemaValidator.validate(createSchema([field]));
      expect(
        result.issues.filter((i) => i.rule === "EMPTY_RELATED_APP"),
      ).toHaveLength(0);
    });
  });

  describe("SUBTABLE 内フィールドの検証", () => {
    it("SUBTABLE 内フィールドも検証対象になる", () => {
      const innerField = textField("inner", "");
      const subtable: SubtableFieldDefinition = {
        code: "table" as FieldCode,
        type: "SUBTABLE",
        label: "テーブル",
        properties: {
          fields: new Map([["inner" as FieldCode, innerField]]),
        },
      };
      const result = SchemaValidator.validate(createSchema([subtable]));
      expect(result.isValid).toBe(false);
      expect(
        result.issues.some(
          (i) => i.fieldCode === "inner" && i.rule === "EMPTY_LABEL",
        ),
      ).toBe(true);
    });

    it("SUBTABLE 内の CALC フィールドの expression も検証される", () => {
      const innerCalc: CalcFieldDefinition = {
        code: "sub_calc" as FieldCode,
        type: "CALC",
        label: "小計",
        properties: { expression: "" },
      };
      const subtable: SubtableFieldDefinition = {
        code: "table" as FieldCode,
        type: "SUBTABLE",
        label: "テーブル",
        properties: {
          fields: new Map([["sub_calc" as FieldCode, innerCalc]]),
        },
      };
      const result = SchemaValidator.validate(createSchema([subtable]));
      expect(
        result.issues.some(
          (i) => i.fieldCode === "sub_calc" && i.rule === "EMPTY_EXPRESSION",
        ),
      ).toBe(true);
    });
  });

  describe("複合エラーの収集", () => {
    it("複数フィールドの複数エラーが全て収集される", () => {
      const emptyLabel = textField("f1", "");
      const emptyOptions: SingleValueSelectionFieldDefinition = {
        code: "f2" as FieldCode,
        type: "DROP_DOWN",
        label: "選択",
        properties: { options: {} },
      };
      const emptyCalc: CalcFieldDefinition = {
        code: "f3" as FieldCode,
        type: "CALC",
        label: "計算",
        properties: { expression: "" },
      };
      const result = SchemaValidator.validate(
        createSchema([emptyLabel, emptyOptions, emptyCalc]),
      );
      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThanOrEqual(3);
      expect(result.issues.some((i) => i.fieldCode === "f1")).toBe(true);
      expect(result.issues.some((i) => i.fieldCode === "f2")).toBe(true);
      expect(result.issues.some((i) => i.fieldCode === "f3")).toBe(true);
    });

    it("warning のみの場合 isValid は true になる", () => {
      const linkWithoutProtocol: LinkFieldDefinition = {
        code: "lnk" as FieldCode,
        type: "LINK",
        label: "リンク",
        properties: {},
      };
      const result = SchemaValidator.validate(
        createSchema([linkWithoutProtocol]),
      );
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe("warning");
    });
  });

  describe("正常なスキーマ", () => {
    it("全て正常なフィールドの場合 isValid が true で issues が空になる", () => {
      const fields: FieldDefinition[] = [
        textField("name", "名前"),
        {
          code: "cb" as FieldCode,
          type: "CHECK_BOX",
          label: "チェック",
          properties: { options: { A: { label: "A", index: "0" } } },
        } as MultiValueSelectionFieldDefinition,
        {
          code: "calc" as FieldCode,
          type: "CALC",
          label: "計算",
          properties: { expression: "a + b" },
        } as CalcFieldDefinition,
        {
          code: "lnk" as FieldCode,
          type: "LINK",
          label: "リンク",
          properties: { protocol: "WEB" },
        } as LinkFieldDefinition,
        {
          code: "file" as FieldCode,
          type: "FILE",
          label: "ファイル",
          properties: { thumbnailSize: "150" },
        } as FileFieldDefinition,
      ];
      const result = SchemaValidator.validate(createSchema(fields));
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });
});
