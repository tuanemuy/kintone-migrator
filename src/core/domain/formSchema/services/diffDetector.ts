import { deepEqual } from "@/lib/deepEqual";
import { buildDiffResult } from "../../diff";
import type { FormLayout, Schema } from "../entity";
import type {
  FieldCode,
  FieldDefinition,
  FormSchemaDiff,
  FormSchemaDiffEntry,
} from "../valueObject";

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
    return deepEqual(
      { ...refA, displayFields: [...refA.displayFields] },
      { ...refB, displayFields: [...refB.displayFields] },
    );
  }

  return deepEqual(a.properties, b.properties);
}

function isFieldEqual(a: FieldDefinition, b: FieldDefinition): boolean {
  if (a.type !== b.type) return false;
  if (a.label !== b.label) return false;
  if (a.code !== b.code) return false;
  if (Boolean(a.noLabel) !== Boolean(b.noLabel)) return false;
  return isPropertiesEqual(a, b);
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

  if (!isPropertiesEqual(before, after)) {
    changes.push("properties changed");
  }

  return changes.length > 0 ? changes.join(", ") : "no visible changes";
}

function isLayoutEqual(a: FormLayout, b: FormLayout): boolean {
  return deepEqual(a, b);
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
  ): FormSchemaDiff => {
    const entries: FormSchemaDiffEntry[] = [];

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

    return buildDiffResult(entries);
  },
};
