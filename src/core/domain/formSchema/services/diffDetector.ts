import { isRecord } from "@/core/domain/typeGuards";
import type { DiffEntry, FormDiff, FormLayout, Schema } from "../entity";
import { FormDiff as FormDiffFactory } from "../entity";
import type { FieldCode, FieldDefinition } from "../valueObject";

function isArrayEqual(a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!isValueEqual(a[i], b[i])) return false;
  }
  return true;
}

function isRecordEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.hasOwn(b, key)) return false;
    if (!isValueEqual(a[key], b[key])) return false;
  }
  return true;
}

function isValueEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a)) return isArrayEqual(a, b);
  if (isRecord(a) && isRecord(b)) {
    return isRecordEqual(a, b);
  }
  return false;
}

function isMapEqual(
  a: ReadonlyMap<FieldCode, FieldDefinition>,
  b: ReadonlyMap<FieldCode, FieldDefinition>,
): boolean {
  if (a.size !== b.size) return false;
  for (const [key, valA] of a) {
    const valB = b.get(key);
    if (valB === undefined) return false;
    if (!isFieldEqual(valA, valB)) return false;
  }
  return true;
}

function isPropertiesEqual(a: FieldDefinition, b: FieldDefinition): boolean {
  if (a.type === "SUBTABLE" && b.type === "SUBTABLE") {
    return isMapEqual(a.properties.fields, b.properties.fields);
  }

  if (a.type === "REFERENCE_TABLE" && b.type === "REFERENCE_TABLE") {
    const refA = a.properties.referenceTable;
    const refB = b.properties.referenceTable;
    return isValueEqual(
      { ...refA, displayFields: [...refA.displayFields] },
      { ...refB, displayFields: [...refB.displayFields] },
    );
  }

  return isValueEqual(a.properties, b.properties);
}

function isFieldEqual(a: FieldDefinition, b: FieldDefinition): boolean {
  if (a.type !== b.type) return false;
  if (a.label !== b.label) return false;
  if (a.code !== b.code) return false;
  if (Boolean(a.noLabel) !== Boolean(b.noLabel)) return false;
  return isPropertiesEqual(a, b);
}

function hasPropertiesChanged(
  before: FieldDefinition,
  after: FieldDefinition,
): boolean {
  if (before.type === "SUBTABLE" && after.type === "SUBTABLE") {
    return !isMapEqual(before.properties.fields, after.properties.fields);
  }

  if (before.type === "REFERENCE_TABLE" && after.type === "REFERENCE_TABLE") {
    const refB = before.properties.referenceTable;
    const refA = after.properties.referenceTable;
    return !isValueEqual(
      { ...refB, displayFields: [...refB.displayFields] },
      { ...refA, displayFields: [...refA.displayFields] },
    );
  }

  return !isValueEqual(before.properties, after.properties);
}

function describeChanges(
  before: FieldDefinition,
  after: FieldDefinition,
): string {
  const changes: string[] = [];

  if (before.type !== after.type) {
    changes.push(`type: ${before.type} -> ${after.type}`);
  }

  if (before.label !== after.label) {
    changes.push(`label: ${before.label} -> ${after.label}`);
  }

  if (Boolean(before.noLabel) !== Boolean(after.noLabel)) {
    changes.push(
      `noLabel: ${before.noLabel ?? false} -> ${after.noLabel ?? false}`,
    );
  }

  if (hasPropertiesChanged(before, after)) {
    changes.push("properties changed");
  }

  return changes.length > 0 ? changes.join(", ") : "no visible changes";
}

function isLayoutEqual(a: FormLayout, b: FormLayout): boolean {
  return isValueEqual(a, b);
}

export const DiffDetector = {
  detectLayoutChanges: (
    schemaLayout: FormLayout,
    currentLayout: FormLayout,
  ): boolean => {
    return !isLayoutEqual(schemaLayout, currentLayout);
  },

  detect: (
    schema: Schema,
    current: ReadonlyMap<FieldCode, FieldDefinition>,
  ): FormDiff => {
    const entries: DiffEntry[] = [];

    for (const [fieldCode, schemaDef] of schema.fields) {
      const currentDef = current.get(fieldCode);

      if (currentDef === undefined) {
        entries.push({
          type: "added",
          fieldCode,
          fieldLabel: schemaDef.label,
          details: "new field",
          after: schemaDef,
        });
      } else if (!isFieldEqual(schemaDef, currentDef)) {
        entries.push({
          type: "modified",
          fieldCode,
          fieldLabel: schemaDef.label,
          details: describeChanges(currentDef, schemaDef),
          before: currentDef,
          after: schemaDef,
        });
      }
    }

    for (const [fieldCode, currentDef] of current) {
      if (!schema.fields.has(fieldCode)) {
        entries.push({
          type: "deleted",
          fieldCode,
          fieldLabel: currentDef.label,
          details: "deleted",
          before: currentDef,
        });
      }
    }

    return FormDiffFactory.create(entries);
  },
};
