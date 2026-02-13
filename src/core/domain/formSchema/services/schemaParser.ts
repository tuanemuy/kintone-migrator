import { parse as parseYaml } from "yaml";
import { BusinessRuleError } from "@/core/domain/error";
import type { LayoutItem, LayoutRow, Schema } from "../entity";
import { FormSchemaErrorCode } from "../errorCode";
import type {
  DecorationElement,
  ElementSize,
  FieldDefinition,
  FieldType,
  GroupFieldDefinition,
  LayoutElement,
  LayoutField,
  ReferenceTableFieldDefinition,
  SubtableFieldDefinition,
  SystemFieldLayout,
} from "../valueObject";
import { FieldCode } from "../valueObject";

const VALID_UNIT_POSITIONS: ReadonlySet<string> = new Set(["BEFORE", "AFTER"]);

const VALID_CALC_FORMATS: ReadonlySet<string> = new Set([
  "NUMBER",
  "NUMBER_DIGIT",
  "DATE",
  "TIME",
  "DATETIME",
  "HOUR_MINUTE",
  "DAY_HOUR_MINUTE",
]);

const VALID_SELECTION_ALIGNS: ReadonlySet<string> = new Set([
  "HORIZONTAL",
  "VERTICAL",
]);

const VALID_LINK_PROTOCOLS: ReadonlySet<string> = new Set([
  "WEB",
  "CALL",
  "MAIL",
]);

function validateEnumProperty(
  fieldCode: string,
  propName: string,
  value: unknown,
  validValues: ReadonlySet<string>,
): void {
  if (value !== undefined && !validValues.has(value as string)) {
    throw new BusinessRuleError(
      FormSchemaErrorCode.InvalidSchemaStructure,
      `Invalid ${propName} "${String(value)}" for field "${fieldCode}". Expected one of: ${[...validValues].join(", ")}`,
    );
  }
}

function validateFieldProperties(
  code: string,
  fieldType: FieldType,
  properties: Record<string, unknown>,
): void {
  switch (fieldType) {
    case "NUMBER":
      validateEnumProperty(
        code,
        "unitPosition",
        properties.unitPosition,
        VALID_UNIT_POSITIONS,
      );
      break;
    case "CALC":
      validateEnumProperty(
        code,
        "format",
        properties.format,
        VALID_CALC_FORMATS,
      );
      validateEnumProperty(
        code,
        "unitPosition",
        properties.unitPosition,
        VALID_UNIT_POSITIONS,
      );
      break;
    case "CHECK_BOX":
    case "RADIO_BUTTON":
    case "MULTI_SELECT":
    case "DROP_DOWN":
      validateEnumProperty(
        code,
        "align",
        properties.align,
        VALID_SELECTION_ALIGNS,
      );
      break;
    case "LINK":
      validateEnumProperty(
        code,
        "protocol",
        properties.protocol,
        VALID_LINK_PROTOCOLS,
      );
      break;
  }
}

const VALID_FIELD_TYPES: ReadonlySet<string> = new Set<FieldType>([
  "SINGLE_LINE_TEXT",
  "MULTI_LINE_TEXT",
  "RICH_TEXT",
  "NUMBER",
  "CALC",
  "CHECK_BOX",
  "RADIO_BUTTON",
  "MULTI_SELECT",
  "DROP_DOWN",
  "DATE",
  "TIME",
  "DATETIME",
  "LINK",
  "USER_SELECT",
  "ORGANIZATION_SELECT",
  "GROUP_SELECT",
  "FILE",
  "GROUP",
  "SUBTABLE",
  "REFERENCE_TABLE",
]);

const DECORATION_TYPES: ReadonlySet<string> = new Set([
  "LABEL",
  "SPACER",
  "HR",
]);

const SYSTEM_FIELD_TYPES: ReadonlySet<string> = new Set([
  "RECORD_NUMBER",
  "CREATOR",
  "CREATED_TIME",
  "MODIFIER",
  "UPDATED_TIME",
  "CATEGORY",
  "STATUS",
  "STATUS_ASSIGNEE",
]);

const BASE_ATTRIBUTES: ReadonlySet<string> = new Set([
  "code",
  "type",
  "label",
  "noLabel",
]);

const LAYOUT_ATTRIBUTES: ReadonlySet<string> = new Set(["size"]);

const DECORATION_ATTRIBUTES: ReadonlySet<string> = new Set(["elementId"]);

const GROUP_ATTRIBUTES: ReadonlySet<string> = new Set(["openGroup", "layout"]);

const SUBTABLE_ATTRIBUTES: ReadonlySet<string> = new Set(["fields"]);

type RawField = Record<string, unknown>;

function parseSize(raw: unknown): ElementSize | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  return {
    ...(obj.width !== undefined ? { width: String(obj.width) } : {}),
    ...(obj.height !== undefined ? { height: String(obj.height) } : {}),
    ...(obj.innerHeight !== undefined
      ? { innerHeight: String(obj.innerHeight) }
      : {}),
  };
}

function normalizePropertyValue(value: unknown): unknown {
  if (typeof value === "number") return String(value);
  return value;
}

function extractProperties(raw: RawField): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (BASE_ATTRIBUTES.has(key)) continue;
    if (LAYOUT_ATTRIBUTES.has(key)) continue;
    if (DECORATION_ATTRIBUTES.has(key)) continue;
    if (GROUP_ATTRIBUTES.has(key)) continue;
    if (SUBTABLE_ATTRIBUTES.has(key)) continue;
    properties[key] = normalizePropertyValue(value);
  }
  return properties;
}

type FieldPropsOf<T extends FieldType> = Extract<
  FieldDefinition,
  { type: T }
>["properties"];

function buildFieldDefinition(
  base: {
    readonly code: FieldCode;
    readonly label: string;
    readonly noLabel?: boolean;
  },
  fieldType: Exclude<FieldType, "SUBTABLE" | "REFERENCE_TABLE">,
  properties: Record<string, unknown>,
): FieldDefinition {
  switch (fieldType) {
    case "SINGLE_LINE_TEXT":
      return {
        ...base,
        type: fieldType,
        properties: properties as FieldPropsOf<"SINGLE_LINE_TEXT">,
      };
    case "MULTI_LINE_TEXT":
      return {
        ...base,
        type: fieldType,
        properties: properties as FieldPropsOf<"MULTI_LINE_TEXT">,
      };
    case "RICH_TEXT":
      return {
        ...base,
        type: fieldType,
        properties: properties as FieldPropsOf<"RICH_TEXT">,
      };
    case "NUMBER":
      return {
        ...base,
        type: fieldType,
        properties: properties as FieldPropsOf<"NUMBER">,
      };
    case "CALC":
      return {
        ...base,
        type: fieldType,
        properties: properties as FieldPropsOf<"CALC">,
      };
    case "RADIO_BUTTON":
    case "DROP_DOWN": {
      const props = { ...properties };
      if (
        props.defaultValue !== undefined &&
        Array.isArray(props.defaultValue)
      ) {
        const arr = props.defaultValue as string[];
        props.defaultValue = arr.length > 0 ? String(arr[0]) : "";
      }
      return {
        ...base,
        type: fieldType,
        properties: props as FieldPropsOf<"RADIO_BUTTON">,
      };
    }
    case "CHECK_BOX":
    case "MULTI_SELECT": {
      const props = { ...properties };
      if (
        props.defaultValue !== undefined &&
        typeof props.defaultValue === "string"
      ) {
        props.defaultValue =
          props.defaultValue === "" ? [] : [props.defaultValue];
      }
      return {
        ...base,
        type: fieldType,
        properties: props as FieldPropsOf<"CHECK_BOX">,
      };
    }
    case "DATE":
      return {
        ...base,
        type: fieldType,
        properties: properties as FieldPropsOf<"DATE">,
      };
    case "TIME":
      return {
        ...base,
        type: fieldType,
        properties: properties as FieldPropsOf<"TIME">,
      };
    case "DATETIME":
      return {
        ...base,
        type: fieldType,
        properties: properties as FieldPropsOf<"DATETIME">,
      };
    case "LINK":
      return {
        ...base,
        type: fieldType,
        properties: properties as FieldPropsOf<"LINK">,
      };
    case "USER_SELECT":
    case "ORGANIZATION_SELECT":
    case "GROUP_SELECT":
      return {
        ...base,
        type: fieldType,
        properties: properties as FieldPropsOf<"USER_SELECT">,
      };
    case "FILE":
      return {
        ...base,
        type: fieldType,
        properties: properties as FieldPropsOf<"FILE">,
      };
    case "GROUP":
      return {
        ...base,
        type: fieldType,
        properties: properties as FieldPropsOf<"GROUP">,
      };
  }
}

function parseFieldDefinitionFromFlat(raw: RawField): FieldDefinition {
  const code = String(raw.code);
  const type = String(raw.type);

  if (!VALID_FIELD_TYPES.has(type)) {
    throw new BusinessRuleError(
      FormSchemaErrorCode.InvalidFieldType,
      `Invalid field type "${type}" for field "${code}"`,
    );
  }

  const fieldCode = FieldCode.create(code);
  const fieldType = type as FieldType;
  const label = String(raw.label ?? "");

  const base = {
    code: fieldCode,
    label,
    ...(raw.noLabel !== undefined ? { noLabel: raw.noLabel as boolean } : {}),
  };

  if (fieldType === "SUBTABLE") {
    const rawFields = (raw.fields ?? []) as RawField[];
    const subFields = new Map<FieldCode, FieldDefinition>();
    for (const subRaw of rawFields) {
      const subDef = parseFieldDefinitionFromFlat(subRaw);
      subFields.set(subDef.code, subDef);
    }
    const def: SubtableFieldDefinition = {
      ...base,
      type: "SUBTABLE",
      properties: { fields: subFields },
    };
    return def;
  }

  if (fieldType === "REFERENCE_TABLE") {
    if (
      raw.referenceTable === undefined ||
      raw.referenceTable === null ||
      typeof raw.referenceTable !== "object"
    ) {
      throw new BusinessRuleError(
        FormSchemaErrorCode.InvalidSchemaStructure,
        `Field "${code}" of type REFERENCE_TABLE must have a "referenceTable" property`,
      );
    }
    const refTable = raw.referenceTable as Record<string, unknown>;

    if (
      refTable.relatedApp === undefined ||
      refTable.relatedApp === null ||
      typeof refTable.relatedApp !== "object"
    ) {
      throw new BusinessRuleError(
        FormSchemaErrorCode.InvalidSchemaStructure,
        `Field "${code}" of type REFERENCE_TABLE must have "referenceTable.relatedApp"`,
      );
    }

    if (
      refTable.condition === undefined ||
      refTable.condition === null ||
      typeof refTable.condition !== "object"
    ) {
      throw new BusinessRuleError(
        FormSchemaErrorCode.InvalidSchemaStructure,
        `Field "${code}" of type REFERENCE_TABLE must have "referenceTable.condition"`,
      );
    }

    if (!Array.isArray(refTable.displayFields)) {
      throw new BusinessRuleError(
        FormSchemaErrorCode.InvalidSchemaStructure,
        `Field "${code}" of type REFERENCE_TABLE must have "referenceTable.displayFields" array`,
      );
    }

    const condition = refTable.condition as Record<string, string>;
    const displayFields = (refTable.displayFields as string[]).map((f) =>
      FieldCode.create(f),
    );
    const def: ReferenceTableFieldDefinition = {
      ...base,
      type: "REFERENCE_TABLE",
      properties: {
        referenceTable: {
          relatedApp: refTable.relatedApp as { app: string },
          condition: {
            field: FieldCode.create(condition.field),
            relatedField: FieldCode.create(condition.relatedField),
          },
          ...(refTable.filterCond !== undefined
            ? { filterCond: refTable.filterCond as string }
            : {}),
          displayFields,
          ...(refTable.sort !== undefined
            ? { sort: refTable.sort as string }
            : {}),
          ...(refTable.size !== undefined
            ? { size: String(refTable.size) }
            : {}),
        },
      },
    };
    return def;
  }

  const properties = extractProperties(raw);
  validateFieldProperties(code, fieldType, properties);

  return buildFieldDefinition(base, fieldType, properties);
}

function parseDecorationElement(raw: RawField): DecorationElement {
  const type = String(raw.type);
  const elementId = String(raw.elementId ?? "");
  const size = parseSize(raw.size) ?? {};

  switch (type) {
    case "LABEL":
      return {
        type: "LABEL",
        label: String(raw.label ?? ""),
        elementId,
        size,
      };
    case "SPACER":
      return { type: "SPACER", elementId, size };
    case "HR":
      return { type: "HR", elementId, size };
    default:
      throw new BusinessRuleError(
        FormSchemaErrorCode.InvalidDecorationElement,
        `Unknown decoration element type: "${type}"`,
      );
  }
}

function parseLayoutElement(raw: RawField): LayoutElement {
  const type = String(raw.type);

  if (DECORATION_TYPES.has(type)) {
    return parseDecorationElement(raw);
  }

  if (SYSTEM_FIELD_TYPES.has(type)) {
    const sysField: SystemFieldLayout = {
      code: String(raw.code),
      type,
      ...(raw.size !== undefined ? { size: parseSize(raw.size) } : {}),
    };
    return sysField;
  }

  const field = parseFieldDefinitionFromFlat(raw);
  const size = parseSize(raw.size);
  const layoutField: LayoutField = {
    field,
    ...(size !== undefined ? { size } : {}),
  };
  return layoutField;
}

function parseLayoutRow(raw: Record<string, unknown>): LayoutRow {
  if (raw.type !== "ROW") {
    throw new BusinessRuleError(
      FormSchemaErrorCode.InvalidLayoutStructure,
      `Expected layout row type "ROW", got "${String(raw.type)}"`,
    );
  }

  const rawFields = (raw.fields ?? []) as RawField[];
  const fields = rawFields.map(parseLayoutElement);

  return { type: "ROW", fields };
}

function parseLayoutItem(
  raw: Record<string, unknown>,
  fieldMap: Map<FieldCode, FieldDefinition>,
): LayoutItem {
  const type = String(raw.type);

  switch (type) {
    case "ROW": {
      const row = parseLayoutRow(raw);
      collectFieldsFromElements(row.fields, fieldMap);
      return row;
    }
    case "GROUP": {
      const code = FieldCode.create(String(raw.code));
      const label = String(raw.label ?? "");
      const noLabel =
        raw.noLabel !== undefined ? (raw.noLabel as boolean) : undefined;
      const openGroup =
        raw.openGroup !== undefined ? (raw.openGroup as boolean) : undefined;
      const rawLayout = (raw.layout ?? []) as Record<string, unknown>[];
      const layout = rawLayout.map((r) => {
        const row = parseLayoutRow(r);
        collectFieldsFromElements(row.fields, fieldMap);
        return row;
      });

      const groupDef: GroupFieldDefinition = {
        code,
        label,
        ...(noLabel !== undefined ? { noLabel } : {}),
        type: "GROUP",
        properties: {
          ...(openGroup !== undefined ? { openGroup } : {}),
        },
      };
      addFieldToMap(fieldMap, code, groupDef);

      return {
        type: "GROUP",
        code,
        label,
        ...(noLabel !== undefined ? { noLabel } : {}),
        ...(openGroup !== undefined ? { openGroup } : {}),
        layout,
      };
    }
    case "SUBTABLE": {
      const code = FieldCode.create(String(raw.code));
      const label = String(raw.label ?? "");
      const noLabel =
        raw.noLabel !== undefined ? (raw.noLabel as boolean) : undefined;
      const rawFields = (raw.fields ?? []) as RawField[];
      const elements = rawFields.map(parseLayoutElement);

      const subFields = new Map<FieldCode, FieldDefinition>();
      collectFieldsFromElements(elements, subFields);

      // サブテーブル内フィールドをグローバルmapにも登録（スコープ間の重複チェック）
      for (const [subCode, subDef] of subFields) {
        addFieldToMap(fieldMap, subCode, subDef);
      }

      const subtableDef: SubtableFieldDefinition = {
        code,
        label,
        ...(noLabel !== undefined ? { noLabel } : {}),
        type: "SUBTABLE",
        properties: { fields: subFields },
      };
      addFieldToMap(fieldMap, code, subtableDef);

      return {
        type: "SUBTABLE",
        code,
        label,
        ...(noLabel !== undefined ? { noLabel } : {}),
        fields: elements,
      };
    }
    default:
      throw new BusinessRuleError(
        FormSchemaErrorCode.InvalidLayoutStructure,
        `Unknown layout item type: "${type}"`,
      );
  }
}

function addFieldToMap(
  fieldMap: Map<FieldCode, FieldDefinition>,
  code: FieldCode,
  definition: FieldDefinition,
): void {
  if (fieldMap.has(code)) {
    throw new BusinessRuleError(
      FormSchemaErrorCode.DuplicateFieldCode,
      `Duplicate field code: "${code}"`,
    );
  }
  fieldMap.set(code, definition);
}

function collectFieldsFromElements(
  elements: readonly LayoutElement[],
  fieldMap: Map<FieldCode, FieldDefinition>,
): void {
  for (const element of elements) {
    if ("field" in element) {
      addFieldToMap(fieldMap, element.field.code, element.field);
    }
  }
}

export const SchemaParser = {
  parse: (rawText: string): Schema => {
    if (rawText.trim().length === 0) {
      throw new BusinessRuleError(
        FormSchemaErrorCode.EmptySchemaText,
        "Schema text cannot be empty",
      );
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(rawText);
    } catch {
      throw new BusinessRuleError(
        FormSchemaErrorCode.InvalidSchemaJson,
        "Schema text is not valid YAML/JSON",
      );
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new BusinessRuleError(
        FormSchemaErrorCode.InvalidSchemaStructure,
        "Schema must be an object",
      );
    }

    const obj = parsed as Record<string, unknown>;

    if ("fields" in obj && !("layout" in obj)) {
      throw new BusinessRuleError(
        FormSchemaErrorCode.InvalidSchemaStructure,
        '"fields" キーが検出されました。スキーマフォーマットが変更されています。「現在の設定を取り込む」で新しいフォーマットのスキーマを生成してください。',
      );
    }

    if (!("layout" in obj) || !Array.isArray(obj.layout)) {
      throw new BusinessRuleError(
        FormSchemaErrorCode.InvalidLayoutStructure,
        'Schema must have a "layout" array',
      );
    }

    const rawLayout = obj.layout as Record<string, unknown>[];
    const fieldMap = new Map<FieldCode, FieldDefinition>();
    const layout: LayoutItem[] = [];

    for (const rawItem of rawLayout) {
      layout.push(parseLayoutItem(rawItem, fieldMap));
    }

    return { fields: fieldMap, layout };
  },
};
