import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneRestAPIError } from "@kintone/rest-api-client";
import {
  ConflictError,
  ConflictErrorCode,
  SystemError,
  SystemErrorCode,
} from "@/core/application/error";
import { isBusinessRuleError } from "@/core/domain/error";
import type {
  FormLayout,
  GroupLayoutItem,
  LayoutItem,
  LayoutRow,
  SubtableLayoutItem,
} from "@/core/domain/formSchema/entity";
import type { FormConfigurator } from "@/core/domain/formSchema/ports/formConfigurator";
import type {
  DecorationElement,
  ElementSize,
  FieldCode,
  FieldDefinition,
  FieldType,
  LayoutElement,
  LayoutField,
  SystemFieldLayout,
} from "@/core/domain/formSchema/valueObject";
import { FieldCode as FieldCodeVO } from "@/core/domain/formSchema/valueObject";

const KNOWN_FIELD_TYPES: ReadonlySet<string> = new Set<FieldType>([
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

const DECORATION_TYPES: ReadonlySet<string> = new Set([
  "LABEL",
  "SPACER",
  "HR",
]);

const KINTONE_REVISION_CONFLICT_CODE = "GAIA_CO02";

function isRevisionConflict(error: unknown): boolean {
  return (
    error instanceof KintoneRestAPIError &&
    error.code === KINTONE_REVISION_CONFLICT_CODE
  );
}

/**
 * Tracks the latest known kintone form revision for optimistic concurrency control.
 *
 * kintone's form API uses revision numbers to detect concurrent modifications.
 * This tracker is injected into the adapter so that the mutable revision state
 * is explicit and owned by the composition root rather than hidden inside the adapter.
 *
 * The tracker is designed to be created per-request scope in the DI container.
 */
export class RevisionTracker {
  private revision: string | undefined = undefined;

  track(revision: string): void {
    if (
      this.revision === undefined ||
      Number(revision) > Number(this.revision)
    ) {
      this.revision = revision;
    }
  }

  get current(): string | undefined {
    return this.revision;
  }
}

type KintoneFieldProperty = Record<string, unknown> & {
  type: string;
  code: string;
  label: string;
  noLabel?: boolean;
};

function assertRecord(
  value: unknown,
  fieldPath: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Expected object at ${fieldPath}, got ${typeof value}`,
    );
  }
}

function assertStringArray(
  value: unknown,
  fieldPath: string,
): asserts value is string[] {
  if (!Array.isArray(value)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Expected array at ${fieldPath}, got ${typeof value}`,
    );
  }
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== "string") {
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        `Expected string at ${fieldPath}[${i}], got ${typeof value[i]}`,
      );
    }
  }
}

function assertString(
  value: unknown,
  fieldPath: string,
): asserts value is string {
  if (typeof value !== "string") {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Expected string at ${fieldPath}, got ${typeof value}`,
    );
  }
}

function fromKintoneProperty(prop: KintoneFieldProperty): FieldDefinition {
  const { type, code, label, noLabel, ...rest } = prop;
  const base = {
    code: FieldCodeVO.create(code),
    label,
    ...(noLabel !== undefined ? { noLabel } : {}),
  };

  if (type === "SUBTABLE" && "fields" in rest) {
    assertRecord(rest.fields, "SUBTABLE.fields");
    const kintoneSubFields = rest.fields as Record<
      string,
      KintoneFieldProperty
    >;
    const subFields = new Map<FieldCode, FieldDefinition>();
    for (const [subCode, subProp] of Object.entries(kintoneSubFields)) {
      assertRecord(subProp, `SUBTABLE.fields.${subCode}`);
      subFields.set(
        FieldCodeVO.create(subCode),
        fromKintoneProperty(subProp as KintoneFieldProperty),
      );
    }
    return {
      ...base,
      type: "SUBTABLE",
      properties: { fields: subFields },
    } as FieldDefinition;
  }

  if (type === "REFERENCE_TABLE" && "referenceTable" in rest) {
    assertRecord(rest.referenceTable, "REFERENCE_TABLE.referenceTable");
    const rt = rest.referenceTable;

    assertRecord(rt.condition, "REFERENCE_TABLE.referenceTable.condition");
    const condition = rt.condition;
    assertString(
      condition.field,
      "REFERENCE_TABLE.referenceTable.condition.field",
    );
    assertString(
      condition.relatedField,
      "REFERENCE_TABLE.referenceTable.condition.relatedField",
    );

    assertStringArray(
      rt.displayFields,
      "REFERENCE_TABLE.referenceTable.displayFields",
    );
    const displayFields = rt.displayFields.map((f: string) =>
      FieldCodeVO.create(f),
    );

    assertRecord(rt.relatedApp, "REFERENCE_TABLE.referenceTable.relatedApp");
    assertString(
      rt.relatedApp.app,
      "REFERENCE_TABLE.referenceTable.relatedApp.app",
    );

    return {
      ...base,
      type: "REFERENCE_TABLE",
      properties: {
        referenceTable: {
          relatedApp: rt.relatedApp as { app: string },
          condition: {
            field: FieldCodeVO.create(condition.field),
            relatedField: FieldCodeVO.create(condition.relatedField),
          },
          ...(rt.filterCond !== undefined
            ? { filterCond: String(rt.filterCond) }
            : {}),
          displayFields,
          ...(rt.sort !== undefined ? { sort: String(rt.sort) } : {}),
          ...(rt.size !== undefined ? { size: String(rt.size) } : {}),
        },
      },
    } as FieldDefinition;
  }

  if (!KNOWN_FIELD_TYPES.has(type)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unknown field type: ${type}`,
    );
  }

  // Normalize defaultValue for selection fields
  if (type === "RADIO_BUTTON" || type === "DROP_DOWN") {
    if (rest.defaultValue !== undefined && Array.isArray(rest.defaultValue)) {
      const arr = rest.defaultValue as string[];
      rest.defaultValue = arr.length > 0 ? String(arr[0]) : "";
    }
  } else if (type === "CHECK_BOX" || type === "MULTI_SELECT") {
    if (
      rest.defaultValue !== undefined &&
      typeof rest.defaultValue === "string"
    ) {
      rest.defaultValue = rest.defaultValue === "" ? [] : [rest.defaultValue];
    }
  }

  return { ...base, type, properties: rest } as FieldDefinition;
}

function toKintoneProperty(field: FieldDefinition): Record<string, unknown> {
  const base: Record<string, unknown> = {
    type: field.type,
    code: field.code as string,
    label: field.label,
    ...(field.noLabel !== undefined ? { noLabel: field.noLabel } : {}),
  };

  if (field.type === "SUBTABLE") {
    const subFields: Record<string, Record<string, unknown>> = {};
    for (const [code, subField] of field.properties.fields) {
      subFields[code as string] = toKintoneProperty(subField);
    }
    return { ...base, fields: subFields };
  }

  if (field.type === "REFERENCE_TABLE") {
    const ref = field.properties.referenceTable;
    return {
      ...base,
      referenceTable: {
        relatedApp: ref.relatedApp,
        condition: {
          field: ref.condition.field as string,
          relatedField: ref.condition.relatedField as string,
        },
        ...(ref.filterCond !== undefined ? { filterCond: ref.filterCond } : {}),
        displayFields: ref.displayFields.map((f) => f as string),
        ...(ref.sort !== undefined ? { sort: ref.sort } : {}),
        ...(ref.size !== undefined ? { size: ref.size } : {}),
      },
    };
  }

  return { ...base, ...field.properties };
}

// Layout conversion: kintone API → domain types

type KintoneLayoutField = Record<string, unknown> & {
  type: string;
  code?: string;
  label?: string;
  elementId?: string;
  size?: Record<string, string>;
};

type KintoneLayoutRow = {
  type: "ROW";
  fields: KintoneLayoutField[];
};

type KintoneLayoutItem = {
  type: string;
  code?: string;
  label?: string;
  openGroup?: boolean;
  fields?: KintoneLayoutField[];
  layout?: KintoneLayoutRow[];
};

function parseElementSize(
  raw: Record<string, string> | undefined,
): ElementSize | undefined {
  if (!raw) return undefined;
  return {
    ...(raw.width !== undefined ? { width: raw.width } : {}),
    ...(raw.height !== undefined ? { height: raw.height } : {}),
    ...(raw.innerHeight !== undefined ? { innerHeight: raw.innerHeight } : {}),
  };
}

function fromKintoneLayoutElement(raw: KintoneLayoutField): LayoutElement {
  const type = raw.type;

  if (DECORATION_TYPES.has(type)) {
    const size = parseElementSize(raw.size) ?? {};
    const elementId = String(raw.elementId ?? "");
    switch (type) {
      case "LABEL":
        return {
          type: "LABEL",
          label: String(raw.label ?? ""),
          elementId,
          size,
        } as DecorationElement;
      case "SPACER":
        return { type: "SPACER", elementId, size } as DecorationElement;
      case "HR":
        return { type: "HR", elementId, size } as DecorationElement;
      default:
        throw new SystemError(
          SystemErrorCode.ExternalApiError,
          `Unknown decoration type: ${type}`,
        );
    }
  }

  if (SYSTEM_FIELD_TYPES.has(type)) {
    return {
      code: String(raw.code ?? ""),
      type,
      ...(raw.size !== undefined ? { size: parseElementSize(raw.size) } : {}),
    } as SystemFieldLayout;
  }

  if (!KNOWN_FIELD_TYPES.has(type)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unknown field type: ${type}`,
    );
  }

  // Layout API only provides type, code, and size for field elements.
  // Full field definitions (label, properties) are obtained via getFormFields()
  // and merged by the use case layer (enrichLayoutWithFields).
  const fieldType = type as FieldType;
  const code = FieldCodeVO.create(String(raw.code ?? ""));
  const size = parseElementSize(raw.size);
  return {
    field: {
      type: fieldType,
      code,
      label: "",
      properties: {},
    } as FieldDefinition,
    ...(size !== undefined ? { size } : {}),
  } as LayoutField;
}

function fromKintoneLayoutRow(raw: KintoneLayoutRow): LayoutRow {
  return {
    type: "ROW",
    fields: (raw.fields ?? []).map(fromKintoneLayoutElement),
  };
}

function fromKintoneLayoutItem(raw: KintoneLayoutItem): LayoutItem {
  switch (raw.type) {
    case "ROW":
      return fromKintoneLayoutRow(raw as KintoneLayoutRow);
    case "GROUP":
      return {
        type: "GROUP",
        code: FieldCodeVO.create(String(raw.code ?? "")),
        label: String(raw.label ?? ""),
        ...(raw.openGroup !== undefined ? { openGroup: raw.openGroup } : {}),
        layout: (raw.layout ?? []).map(fromKintoneLayoutRow),
      } as GroupLayoutItem;
    case "SUBTABLE":
      return {
        type: "SUBTABLE",
        code: FieldCodeVO.create(String(raw.code ?? "")),
        label: String(raw.label ?? ""),
        fields: (raw.fields ?? []).map(fromKintoneLayoutElement),
      } as SubtableLayoutItem;
    default:
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        `Unknown layout item type: ${raw.type}`,
      );
  }
}

// Layout conversion: domain types → kintone API

function toKintoneLayoutElement(
  element: LayoutElement,
): Record<string, unknown> {
  if ("field" in element) {
    const lf = element as LayoutField;
    const result: Record<string, unknown> = {
      type: lf.field.type,
      code: lf.field.code as string,
    };
    if (lf.size !== undefined) {
      result.size = lf.size;
    }
    return result;
  }

  if ("elementId" in element && !("code" in element)) {
    const dec = element as DecorationElement;
    const result: Record<string, unknown> = {
      type: dec.type,
      elementId: dec.elementId,
      size: dec.size,
    };
    if (dec.type === "LABEL") {
      result.label = dec.label;
    }
    return result;
  }

  const sys = element as SystemFieldLayout;
  return {
    type: sys.type,
    code: sys.code,
    ...(sys.size !== undefined ? { size: sys.size } : {}),
  };
}

function toKintoneLayoutRow(row: LayoutRow): Record<string, unknown> {
  return {
    type: "ROW",
    fields: row.fields.map(toKintoneLayoutElement),
  };
}

function toKintoneLayoutItem(item: LayoutItem): Record<string, unknown> {
  switch (item.type) {
    case "ROW":
      return toKintoneLayoutRow(item);
    case "GROUP": {
      const group = item as GroupLayoutItem;
      return {
        type: "GROUP",
        code: group.code as string,
        ...(group.openGroup !== undefined
          ? { openGroup: group.openGroup }
          : {}),
        layout: group.layout.map(toKintoneLayoutRow),
      };
    }
    case "SUBTABLE": {
      const subtable = item as SubtableLayoutItem;
      return {
        type: "SUBTABLE",
        code: subtable.code as string,
        fields: subtable.fields.map(toKintoneLayoutElement),
      };
    }
    default:
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        `Unknown layout item type: ${(item satisfies never as LayoutItem).type}`,
      );
  }
}

export class KintoneFormConfigurator implements FormConfigurator {
  private readonly revisionTracker: RevisionTracker;

  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
    revisionTracker?: RevisionTracker,
  ) {
    this.revisionTracker = revisionTracker ?? new RevisionTracker();
  }

  async getFields(): Promise<ReadonlyMap<FieldCode, FieldDefinition>> {
    try {
      const { properties, revision } = await this.client.app.getFormFields({
        app: this.appId,
        preview: true,
      });
      this.revisionTracker.track(revision);

      const fields = new Map<FieldCode, FieldDefinition>();
      for (const [code, prop] of Object.entries(properties)) {
        const kintoneProp = prop as KintoneFieldProperty;
        if (SYSTEM_FIELD_TYPES.has(kintoneProp.type)) continue;
        const fieldDef = fromKintoneProperty(kintoneProp);
        fields.set(FieldCodeVO.create(code), fieldDef);
        // Subtable inner fields are also registered at the top level so that
        // diff detection and layout enrichment can look up any field by code.
        // kintone guarantees field codes are unique across the entire form,
        // including subtable inner fields, so no collision can occur.
        if (fieldDef.type === "SUBTABLE") {
          for (const [subCode, subDef] of fieldDef.properties.fields) {
            fields.set(subCode, subDef);
          }
        }
      }

      return fields;
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to get form fields",
        error,
      );
    }
  }

  async addFields(fields: readonly FieldDefinition[]): Promise<void> {
    try {
      const properties: Record<string, Record<string, unknown>> = {};
      for (const field of fields) {
        properties[field.code as string] = toKintoneProperty(field);
      }
      const response = await this.client.app.addFormFields({
        app: this.appId,
        properties,
        ...(this.revisionTracker.current !== undefined
          ? { revision: this.revisionTracker.current }
          : {}),
      });
      if (response.revision) {
        this.revisionTracker.track(response.revision);
      }
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      if (isRevisionConflict(error)) {
        throw new ConflictError(
          ConflictErrorCode.Conflict,
          "Form configuration was modified by another process. Please retry the operation.",
          error,
        );
      }
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to add form fields",
        error,
      );
    }
  }

  async updateFields(fields: readonly FieldDefinition[]): Promise<void> {
    try {
      const properties: Record<string, Record<string, unknown>> = {};
      for (const field of fields) {
        properties[field.code as string] = toKintoneProperty(field);
      }
      const response = await this.client.app.updateFormFields({
        app: this.appId,
        properties,
        ...(this.revisionTracker.current !== undefined
          ? { revision: this.revisionTracker.current }
          : {}),
      });
      if (response.revision) {
        this.revisionTracker.track(response.revision);
      }
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      if (isRevisionConflict(error)) {
        throw new ConflictError(
          ConflictErrorCode.Conflict,
          "Form configuration was modified by another process. Please retry the operation.",
          error,
        );
      }
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to update form fields",
        error,
      );
    }
  }

  async deleteFields(fieldCodes: readonly FieldCode[]): Promise<void> {
    try {
      // The SDK's type definition for deleteFormFields() does not include the `revision`
      // property in its return type, but the kintone API does return it at runtime.
      // We cast to access the revision for optimistic concurrency tracking.
      const response = (await this.client.app.deleteFormFields({
        app: this.appId,
        fields: fieldCodes.map((code) => code as string),
        ...(this.revisionTracker.current !== undefined
          ? { revision: this.revisionTracker.current }
          : {}),
      })) as { revision?: string };
      if (response.revision) {
        this.revisionTracker.track(response.revision);
      }
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      if (isRevisionConflict(error)) {
        throw new ConflictError(
          ConflictErrorCode.Conflict,
          "Form configuration was modified by another process. Please retry the operation.",
          error,
        );
      }
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to delete form fields",
        error,
      );
    }
  }

  async getLayout(): Promise<FormLayout> {
    try {
      const response = await this.client.app.getFormLayout({
        app: this.appId,
        preview: true,
      });
      this.revisionTracker.track(response.revision);

      return (response.layout as KintoneLayoutItem[]).map(
        fromKintoneLayoutItem,
      );
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to get form layout",
        error,
      );
    }
  }

  async updateLayout(layout: FormLayout): Promise<void> {
    try {
      const kintoneLayout = layout.map(toKintoneLayoutItem);
      const response = await this.client.app.updateFormLayout({
        app: this.appId,
        layout: kintoneLayout as Parameters<
          typeof this.client.app.updateFormLayout
        >[0]["layout"],
        revision:
          this.revisionTracker.current !== undefined
            ? Number(this.revisionTracker.current)
            : -1,
      });
      if (response.revision) {
        this.revisionTracker.track(response.revision);
      }
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      if (isRevisionConflict(error)) {
        throw new ConflictError(
          ConflictErrorCode.Conflict,
          "Form configuration was modified by another process. Please retry the operation.",
          error,
        );
      }
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to update form layout",
        error,
      );
    }
  }
}
