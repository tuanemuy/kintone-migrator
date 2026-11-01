import { BusinessRuleError } from "@/core/domain/error";
import { hasControlChars, sanitizeForDisplay } from "@/lib/charValidation";
import type { DiffResult, ThreeWayEntry } from "../diff";
import type { FormLayout } from "./entity";
import { FormSchemaErrorCode } from "./errorCode";

// Lookup
export type LookupFieldMapping = Readonly<{
  field: string;
  relatedField: string;
}>;

/** Refers to the related app by its app ID, which differs per environment. */
export type RelatedAppById = Readonly<{ app: string; code?: never }>;

/** Refers to the related app by its app code, which stays across environments. */
export type RelatedAppByCode = Readonly<{ code: string; app?: never }>;

/** How a schema refers to the app a lookup or a reference table uses. */
export type RelatedApp = RelatedAppById | RelatedAppByCode;

/**
 * The related app as kintone reports it: by both its app ID and its app code
 * (`""` when the app has none). It becomes a {@link RelatedApp} before it is
 * compared, sent or written.
 */
export type RemoteRelatedApp = Readonly<{ app: string; code: string }>;

export type AnyRelatedApp = RelatedApp | RemoteRelatedApp;

export type Lookup<R extends AnyRelatedApp = RelatedApp> = Readonly<{
  relatedApp: R;
  relatedKeyField: string;
  fieldMappings: readonly LookupFieldMapping[];
  lookupPickerFields: readonly string[];
  /** `""` when the lookup has no filter condition. */
  filterCond: string;
  /** `""` when the lookup has no sort order. */
  sort: string;
}>;

// FieldCode
export type FieldCode = string & { readonly brand: "FieldCode" };

function hasInvalidFieldCodeChars(code: string): boolean {
  if (hasControlChars(code)) return true;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (c === "/" || c === "\\") return true;
  }
  return false;
}

export const FieldCode = {
  create: (code: string): FieldCode => {
    if (code.length === 0) {
      throw new BusinessRuleError(
        FormSchemaErrorCode.FsEmptyFieldCode,
        "Field code cannot be empty",
      );
    }
    if (hasInvalidFieldCodeChars(code)) {
      throw new BusinessRuleError(
        FormSchemaErrorCode.FsInvalidFieldCode,
        `Field code "${sanitizeForDisplay(code)}" contains invalid characters`,
      );
    }
    return code as FieldCode;
  },
};

// FieldType
export type FieldType =
  | "SINGLE_LINE_TEXT"
  | "MULTI_LINE_TEXT"
  | "RICH_TEXT"
  | "NUMBER"
  | "CALC"
  | "CHECK_BOX"
  | "RADIO_BUTTON"
  | "MULTI_SELECT"
  | "DROP_DOWN"
  | "DATE"
  | "TIME"
  | "DATETIME"
  | "LINK"
  | "USER_SELECT"
  | "ORGANIZATION_SELECT"
  | "GROUP_SELECT"
  | "FILE"
  | "GROUP"
  | "SUBTABLE"
  | "REFERENCE_TABLE";

export type FormSchemaDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  fieldCode: FieldCode;
  fieldLabel: string;
  details: string;
  before?: FieldDefinition;
  after?: FieldDefinition;
}>;

export type FormSchemaDiff = DiffResult<FormSchemaDiffEntry>;

// SelectionOption
export type SelectionOption = Readonly<{
  label: string;
  index: string;
}>;

// FieldDefinition base
type FieldDefinitionBase = Readonly<{
  code: FieldCode;
  label: string;
  noLabel?: boolean;
}>;

// Text fields
export type SingleLineTextFieldDefinition<
  R extends AnyRelatedApp = RelatedApp,
> = FieldDefinitionBase &
  Readonly<{
    type: "SINGLE_LINE_TEXT";
    properties: Readonly<{
      required?: boolean;
      unique?: boolean;
      defaultValue?: string;
      minLength?: string;
      maxLength?: string;
      expression?: string;
      hideExpression?: boolean;
      lookup?: Lookup<R>;
    }>;
  }>;

export type MultiLineTextFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "MULTI_LINE_TEXT";
    properties: Readonly<{
      required?: boolean;
      defaultValue?: string;
      minLength?: string;
      maxLength?: string;
    }>;
  }>;

export type RichTextFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "RICH_TEXT";
    properties: Readonly<{
      required?: boolean;
      defaultValue?: string;
    }>;
  }>;

// Number fields
export type NumberFieldDefinition<R extends AnyRelatedApp = RelatedApp> =
  FieldDefinitionBase &
    Readonly<{
      type: "NUMBER";
      properties: Readonly<{
        required?: boolean;
        unique?: boolean;
        defaultValue?: string;
        minValue?: string;
        maxValue?: string;
        digit?: boolean;
        displayScale?: string;
        unit?: string;
        unitPosition?: "BEFORE" | "AFTER";
        lookup?: Lookup<R>;
      }>;
    }>;

export type CalcFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "CALC";
    properties: Readonly<{
      expression: string;
      format?:
        | "NUMBER"
        | "NUMBER_DIGIT"
        | "DATE"
        | "TIME"
        | "DATETIME"
        | "HOUR_MINUTE"
        | "DAY_HOUR_MINUTE";
      displayScale?: string;
      unit?: string;
      unitPosition?: "BEFORE" | "AFTER";
      hideExpression?: boolean;
    }>;
  }>;

// Selection fields
export type MultiValueSelectionFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "CHECK_BOX" | "MULTI_SELECT";
    properties: Readonly<{
      required?: boolean;
      defaultValue?: readonly string[];
      options: Readonly<Record<string, SelectionOption>>;
      align?: "HORIZONTAL" | "VERTICAL";
    }>;
  }>;

export type SingleValueSelectionFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "RADIO_BUTTON" | "DROP_DOWN";
    properties: Readonly<{
      required?: boolean;
      defaultValue?: string;
      options: Readonly<Record<string, SelectionOption>>;
      align?: "HORIZONTAL" | "VERTICAL";
    }>;
  }>;

export type SelectionFieldDefinition =
  | MultiValueSelectionFieldDefinition
  | SingleValueSelectionFieldDefinition;

// Date/Time fields
export type DateFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "DATE";
    properties: Readonly<{
      required?: boolean;
      unique?: boolean;
      defaultValue?: string;
      defaultNowValue?: boolean;
    }>;
  }>;

export type TimeFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "TIME";
    properties: Readonly<{
      required?: boolean;
      defaultValue?: string;
      defaultNowValue?: boolean;
    }>;
  }>;

export type DateTimeFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "DATETIME";
    properties: Readonly<{
      required?: boolean;
      unique?: boolean;
      defaultValue?: string;
      defaultNowValue?: boolean;
    }>;
  }>;

// Link field
export type LinkFieldDefinition<R extends AnyRelatedApp = RelatedApp> =
  FieldDefinitionBase &
    Readonly<{
      type: "LINK";
      properties: Readonly<{
        required?: boolean;
        unique?: boolean;
        defaultValue?: string;
        minLength?: string;
        maxLength?: string;
        protocol?: "WEB" | "CALL" | "MAIL";
        lookup?: Lookup<R>;
      }>;
    }>;

// User select fields
export type UserSelectFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "USER_SELECT" | "ORGANIZATION_SELECT" | "GROUP_SELECT";
    properties: Readonly<{
      required?: boolean;
      defaultValue?: readonly Readonly<{ code: string; type: string }>[];
      entities?: readonly Readonly<{ code: string; type: string }>[];
    }>;
  }>;

// File field
export type FileFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "FILE";
    properties: Readonly<{
      required?: boolean;
      thumbnailSize?: string;
    }>;
  }>;

// Layout fields
export type GroupFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "GROUP";
    properties: Readonly<{
      openGroup?: boolean;
    }>;
  }>;

export type SubtableFieldDefinition<R extends AnyRelatedApp = RelatedApp> =
  FieldDefinitionBase &
    Readonly<{
      type: "SUBTABLE";
      properties: Readonly<{
        fields: ReadonlyMap<FieldCode, FieldDefinition<R>>;
      }>;
    }>;

export type ReferenceTableFieldDefinition<
  R extends AnyRelatedApp = RelatedApp,
> = FieldDefinitionBase &
  Readonly<{
    type: "REFERENCE_TABLE";
    properties: Readonly<{
      referenceTable: Readonly<{
        relatedApp: R;
        condition: Readonly<{
          field: FieldCode;
          relatedField: FieldCode;
        }>;
        /** `""` when the reference table has no filter condition. */
        filterCond: string;
        displayFields: readonly FieldCode[];
        /** `""` when the reference table has no sort order. */
        sort: string;
        size?: string;
      }>;
    }>;
  }>;

// FieldDefinition union
/**
 * A field definition. `R` is how its related apps are held: a schema's
 * {@link RelatedApp} by default, or a {@link RemoteRelatedApp} as read from
 * kintone ({@link RemoteFieldDefinition}).
 */
export type FieldDefinition<R extends AnyRelatedApp = RelatedApp> =
  | SingleLineTextFieldDefinition<R>
  | MultiLineTextFieldDefinition
  | RichTextFieldDefinition
  | NumberFieldDefinition<R>
  | CalcFieldDefinition
  | MultiValueSelectionFieldDefinition
  | SingleValueSelectionFieldDefinition
  | DateFieldDefinition
  | TimeFieldDefinition
  | DateTimeFieldDefinition
  | LinkFieldDefinition<R>
  | UserSelectFieldDefinition
  | FileFieldDefinition
  | GroupFieldDefinition
  | SubtableFieldDefinition<R>
  | ReferenceTableFieldDefinition<R>;

/** A field definition as read from kintone. */
export type RemoteFieldDefinition = FieldDefinition<RemoteRelatedApp>;

// Layout-related types

export type ElementSize = Readonly<{
  width?: string;
  height?: string;
  innerHeight?: string;
}>;

export type LayoutElementType = "LABEL" | "SPACER" | "HR";

export type LabelElement = Readonly<{
  kind: "decoration";
  type: "LABEL";
  label: string;
  elementId: string;
  size: ElementSize;
}>;

export type SpacerElement = Readonly<{
  kind: "decoration";
  type: "SPACER";
  elementId: string;
  size: ElementSize;
}>;

export type HrElement = Readonly<{
  kind: "decoration";
  type: "HR";
  elementId: string;
  size: ElementSize;
}>;

export type DecorationElement = LabelElement | SpacerElement | HrElement;

export type LayoutField = Readonly<{
  kind: "field";
  field: FieldDefinition;
  size?: ElementSize;
}>;

export type SystemFieldLayout = Readonly<{
  kind: "systemField";
  code: string;
  type: string;
  size?: ElementSize;
}>;

export type LayoutElement = LayoutField | DecorationElement | SystemFieldLayout;

// --- 3-way merge value objects ---

/**
 * Result of a formSchema 3-way merge.
 *
 * Fields are merged per-entity (subtable counts as a single entity; subtable
 * inner fields and GROUP definitions are excluded from the field channel and
 * handled via the layout channel). Layout is coarse-grained: a single
 * `layoutConflict` flag rather than per-element merge (ADR-003).
 */
export type FormSchemaThreeWayMerge = Readonly<{
  /** Per-field 3-way classification (normalized field channel). */
  fieldEntries: readonly ThreeWayEntry<FieldCode, FieldDefinition>[];
  /** Subset of `fieldEntries` that are conflicts (both sides changed). */
  fieldConflicts: readonly ThreeWayEntry<FieldCode, FieldDefinition>[];
  /** True when both local and remote changed the layout from base. */
  layoutConflict: boolean;
  baseLayout: FormLayout;
  localLayout: FormLayout;
  remoteLayout: FormLayout;
  /**
   * Auto-resolved layout when there is no conflict (the changed side, or base
   * when neither changed). `undefined` when `layoutConflict` is true.
   */
  mergedLayout?: FormLayout;
  /**
   * Which side the auto-merged layout was taken from when there is no conflict:
   * the changed side, or `"base"` when neither side changed (base == local ==
   * remote). Set explicitly so `resolveMerge` does not rely on reference
   * equality of `mergedLayout`. `"base"` is undefined-of-side and treated as
   * `"local"` for field-map reconstruction (all three sides agree).
   */
  layoutAutoSide?: "local" | "remote" | "base";
  /** True when any side diverged (field or layout). */
  hasConflict: boolean;
  /** Field maps used to reconstruct GROUP/subtable-inner from layout. */
  baseFields: ReadonlyMap<FieldCode, FieldDefinition>;
  localFields: ReadonlyMap<FieldCode, FieldDefinition>;
  remoteFields: ReadonlyMap<FieldCode, FieldDefinition>;
}>;

/**
 * Conflict resolution choices for {@link FormSchemaThreeWayMerge}.
 *
 * `fields` must cover every entry in `fieldConflicts`. `layout` must be
 * `"local"` or `"remote"` when `layoutConflict` is true, otherwise
 * `"noConflict"`. The type forces the caller to address both channels.
 */
export type MergeResolution = Readonly<{
  fields: ReadonlyMap<FieldCode, "local" | "remote">;
  layout: "local" | "remote" | "noConflict";
}>;
