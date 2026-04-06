import { deepEqual } from "@/lib/deepEqual";
import { buildDiffResult } from "../../diff";
import { formatValue } from "../../services/formatValue";
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
    return deepEqual(a.properties.referenceTable, b.properties.referenceTable);
  }

  return deepEqual(a.properties, b.properties);
}

function isFieldEqual(a: FieldDefinition, b: FieldDefinition): boolean {
  if (a.type !== b.type) return false;
  if (a.label !== b.label) return false;
  if (a.code !== b.code) return false;
  if ((a.noLabel ?? false) !== (b.noLabel ?? false)) return false;
  return isPropertiesEqual(a, b);
}

function describePropertiesChanges(
  before: FieldDefinition,
  after: FieldDefinition,
): string[] {
  if (before.type !== after.type) {
    // Type mismatch makes property-level comparison meaningless;
    // the type change is already reported by describeChanges.
    return [];
  }

  if (before.type === "SUBTABLE" && after.type === "SUBTABLE") {
    const beforeObj = Object.fromEntries(
      Array.from(before.properties.fields.entries()),
    );
    const afterObj = Object.fromEntries(
      Array.from(after.properties.fields.entries()),
    );
    return [`fields: ${formatValue(beforeObj)} -> ${formatValue(afterObj)}`];
  }

  if (before.type === "REFERENCE_TABLE" && after.type === "REFERENCE_TABLE") {
    const bRef = before.properties.referenceTable;
    const aRef = after.properties.referenceTable;
    const subChanges: string[] = [];
    const subProps = [
      "relatedApp",
      "condition",
      "filterCond",
      "displayFields",
      "sort",
      "size",
    ] as const;
    for (const key of subProps) {
      if (!deepEqual(bRef[key], aRef[key])) {
        subChanges.push(
          `referenceTable.${key}: ${formatValue(bRef[key])} -> ${formatValue(aRef[key])}`,
        );
      }
    }
    return subChanges.length > 0 ? subChanges : ["referenceTable changed"];
  }

  // Normal fields: compare properties as Record<string, unknown>
  const bProps = before.properties as Record<string, unknown>;
  const aProps = after.properties as Record<string, unknown>;
  const allKeys = new Set([...Object.keys(bProps), ...Object.keys(aProps)]);
  const propChanges: string[] = [];
  for (const key of allKeys) {
    if (!deepEqual(bProps[key], aProps[key])) {
      propChanges.push(
        `${key}: ${formatValue(bProps[key])} -> ${formatValue(aProps[key])}`,
      );
    }
  }
  return propChanges;
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

  if ((before.noLabel ?? false) !== (after.noLabel ?? false)) {
    changes.push(
      `noLabel: ${before.noLabel ?? false} -> ${after.noLabel ?? false}`,
    );
  }

  if (!isPropertiesEqual(before, after)) {
    changes.push(...describePropertiesChanges(before, after));
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
          details: "removed",
          before: currentDef,
        });
      }
    }

    return buildDiffResult(entries);
  },
};
