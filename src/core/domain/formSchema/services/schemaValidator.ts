import type { Schema } from "../entity";
import type {
  FieldCode,
  FieldDefinition,
  LinkFieldDefinition,
  NumberFieldDefinition,
  SelectionFieldDefinition,
  SingleLineTextFieldDefinition,
} from "../valueObject";

export type ValidationSeverity = "error" | "warning";

export type ValidationIssue = Readonly<{
  severity: ValidationSeverity;
  fieldCode: string;
  fieldType: string;
  rule: string;
  message: string;
}>;

export type ValidationResult = Readonly<{
  issues: readonly ValidationIssue[];
  isValid: boolean;
}>;

const SELECTION_TYPES = new Set([
  "CHECK_BOX",
  "RADIO_BUTTON",
  "MULTI_SELECT",
  "DROP_DOWN",
]);

const VALID_THUMBNAIL_SIZES = new Set(["50", "150", "250", "500"]);

const VALID_REFERENCE_TABLE_SIZES = new Set([
  "1",
  "3",
  "5",
  "10",
  "20",
  "30",
  "40",
  "50",
]);

const LOOKUP_FIELD_TYPES = new Set(["SINGLE_LINE_TEXT", "NUMBER", "LINK"]);

type LookupCapableFieldDefinition =
  | SingleLineTextFieldDefinition
  | NumberFieldDefinition
  | LinkFieldDefinition;

function isSelectionField(
  field: FieldDefinition,
): field is SelectionFieldDefinition {
  return SELECTION_TYPES.has(field.type);
}

function isLookupCapableField(
  field: FieldDefinition,
): field is LookupCapableFieldDefinition {
  return LOOKUP_FIELD_TYPES.has(field.type);
}

function issue(
  severity: ValidationSeverity,
  fieldCode: string,
  fieldType: string,
  rule: string,
  message: string,
): ValidationIssue {
  return { severity, fieldCode, fieldType, rule, message };
}

function validateLabelNonEmpty(field: FieldDefinition): ValidationIssue[] {
  if (field.label.trim().length === 0) {
    return [
      issue(
        "error",
        field.code,
        field.type,
        "EMPTY_LABEL",
        `Field "${field.code}" must have a non-empty label`,
      ),
    ];
  }
  return [];
}

function validateSelectionOptions(field: FieldDefinition): ValidationIssue[] {
  if (!isSelectionField(field)) return [];

  if (Object.keys(field.properties.options).length === 0) {
    return [
      issue(
        "error",
        field.code,
        field.type,
        "EMPTY_OPTIONS",
        `Field "${field.code}" of type ${field.type} must have at least one option`,
      ),
    ];
  }
  return [];
}

function validateSelectionOptionStructure(
  field: FieldDefinition,
): ValidationIssue[] {
  if (!isSelectionField(field)) return [];

  // Cast to loose type for runtime defense against malformed option entries
  const options = field.properties.options as Record<
    string,
    { label?: string; index?: string }
  >;

  const issues: ValidationIssue[] = [];
  for (const [key, opt] of Object.entries(options)) {
    if (opt === null || typeof opt !== "object") {
      issues.push(
        issue(
          "error",
          field.code,
          field.type,
          "INVALID_OPTION_STRUCTURE",
          `Field "${field.code}" option "${key}" must be an object with "label" and "index" properties`,
        ),
      );
      continue;
    }
    if (opt.label === undefined || opt.label === null) {
      issues.push(
        issue(
          "error",
          field.code,
          field.type,
          "INVALID_OPTION_STRUCTURE",
          `Field "${field.code}" option "${key}" must have a "label" property`,
        ),
      );
    }
    if (opt.index === undefined || opt.index === null) {
      issues.push(
        issue(
          "error",
          field.code,
          field.type,
          "INVALID_OPTION_STRUCTURE",
          `Field "${field.code}" option "${key}" must have an "index" property`,
        ),
      );
    }
  }
  return issues;
}

function validateCalcExpression(field: FieldDefinition): ValidationIssue[] {
  if (field.type !== "CALC") return [];

  if (
    field.properties.expression === undefined ||
    field.properties.expression.trim().length === 0
  ) {
    return [
      issue(
        "error",
        field.code,
        field.type,
        "EMPTY_EXPRESSION",
        `Field "${field.code}" of type CALC must have a non-empty "expression"`,
      ),
    ];
  }
  return [];
}

function validateLinkProtocol(field: FieldDefinition): ValidationIssue[] {
  if (field.type !== "LINK") return [];

  if (field.properties.protocol === undefined) {
    return [
      issue(
        "warning",
        field.code,
        field.type,
        "MISSING_PROTOCOL",
        `Field "${field.code}" of type LINK should have a "protocol" (WEB, CALL, or MAIL)`,
      ),
    ];
  }
  return [];
}

function validateFileThumbnailSize(field: FieldDefinition): ValidationIssue[] {
  if (field.type !== "FILE") return [];

  if (
    field.properties.thumbnailSize !== undefined &&
    !VALID_THUMBNAIL_SIZES.has(field.properties.thumbnailSize)
  ) {
    return [
      issue(
        "error",
        field.code,
        field.type,
        "INVALID_THUMBNAIL_SIZE",
        `Field "${field.code}" has invalid thumbnailSize "${field.properties.thumbnailSize}". Valid values: ${[...VALID_THUMBNAIL_SIZES].join(", ")}`,
      ),
    ];
  }
  return [];
}

function validateReferenceTableSize(field: FieldDefinition): ValidationIssue[] {
  if (field.type !== "REFERENCE_TABLE") return [];

  const { size } = field.properties.referenceTable;
  if (size !== undefined && !VALID_REFERENCE_TABLE_SIZES.has(size)) {
    return [
      issue(
        "error",
        field.code,
        field.type,
        "INVALID_REFERENCE_TABLE_SIZE",
        `Field "${field.code}" has invalid referenceTable.size "${size}". Valid values: ${[...VALID_REFERENCE_TABLE_SIZES].join(", ")}`,
      ),
    ];
  }
  return [];
}

function validateLookupStructure(field: FieldDefinition): ValidationIssue[] {
  if (!isLookupCapableField(field)) return [];

  const { lookup } = field.properties;
  if (lookup === undefined) return [];

  const issues: ValidationIssue[] = [];

  if (lookup.relatedApp.app.trim().length === 0) {
    issues.push(
      issue(
        "error",
        field.code,
        field.type,
        "INVALID_LOOKUP",
        `Field "${field.code}" lookup must have a non-empty "relatedApp.app"`,
      ),
    );
  }

  if (lookup.relatedKeyField.trim().length === 0) {
    issues.push(
      issue(
        "error",
        field.code,
        field.type,
        "INVALID_LOOKUP",
        `Field "${field.code}" lookup must have a non-empty "relatedKeyField"`,
      ),
    );
  }

  return issues;
}

function validateReferenceTableRelatedApp(
  field: FieldDefinition,
): ValidationIssue[] {
  if (field.type !== "REFERENCE_TABLE") return [];

  const { app } = field.properties.referenceTable.relatedApp;
  if (app.trim().length === 0) {
    return [
      issue(
        "error",
        field.code,
        field.type,
        "EMPTY_RELATED_APP",
        `Field "${field.code}" referenceTable.relatedApp.app must be non-empty`,
      ),
    ];
  }
  return [];
}

const FIELD_VALIDATORS: readonly ((
  field: FieldDefinition,
) => ValidationIssue[])[] = [
  validateLabelNonEmpty,
  validateSelectionOptions,
  validateSelectionOptionStructure,
  validateCalcExpression,
  validateLinkProtocol,
  validateFileThumbnailSize,
  validateReferenceTableSize,
  validateLookupStructure,
  validateReferenceTableRelatedApp,
];

function validateField(field: FieldDefinition): readonly ValidationIssue[] {
  return FIELD_VALIDATORS.flatMap((validator) => validator(field));
}

function validateFields(
  fields: ReadonlyMap<FieldCode, FieldDefinition>,
): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const field of fields.values()) {
    issues.push(...validateField(field));

    if (field.type === "SUBTABLE") {
      for (const innerField of field.properties.fields.values()) {
        issues.push(...validateField(innerField));
      }
    }
  }

  return issues;
}

export const SchemaValidator = {
  validate: (schema: Schema): ValidationResult => {
    const issues = validateFields(schema.fields);
    const isValid = issues.every((i) => i.severity !== "error");
    return { issues, isValid };
  },
};
