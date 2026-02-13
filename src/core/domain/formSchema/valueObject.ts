import { BusinessRuleError } from "@/core/domain/error";
import { FormSchemaErrorCode } from "./errorCode";

// Lookup
export type LookupFieldMapping = Readonly<{
  field: string;
  relatedField: string;
}>;

export type Lookup = Readonly<{
  relatedApp: Readonly<{ app: string; code?: string }>;
  relatedKeyField: string;
  fieldMappings: readonly LookupFieldMapping[];
  lookupPickerFields: readonly string[];
  filterCond?: string;
  sort?: string;
}>;

// FieldCode
export type FieldCode = string & { readonly brand: "FieldCode" };

export const FieldCode = {
  create: (code: string): FieldCode => {
    if (code.length === 0) {
      throw new BusinessRuleError(
        FormSchemaErrorCode.EmptyFieldCode,
        "Field code cannot be empty",
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

// DiffType
export type DiffType = "added" | "modified" | "deleted";

// DiffSummary
export type DiffSummary = Readonly<{
  added: number;
  modified: number;
  deleted: number;
  total: number;
}>;

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
export type SingleLineTextFieldDefinition = FieldDefinitionBase &
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
      lookup?: Lookup;
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
export type NumberFieldDefinition = FieldDefinitionBase &
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
      lookup?: Lookup;
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
export type SelectionFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "CHECK_BOX" | "RADIO_BUTTON" | "MULTI_SELECT" | "DROP_DOWN";
    properties: Readonly<{
      required?: boolean;
      defaultValue?: readonly string[];
      options: Readonly<Record<string, SelectionOption>>;
      align?: "HORIZONTAL" | "VERTICAL";
    }>;
  }>;

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
export type LinkFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "LINK";
    properties: Readonly<{
      required?: boolean;
      unique?: boolean;
      defaultValue?: string;
      minLength?: string;
      maxLength?: string;
      protocol?: "WEB" | "CALL" | "MAIL";
      lookup?: Lookup;
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

export type SubtableFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "SUBTABLE";
    properties: Readonly<{
      fields: ReadonlyMap<FieldCode, FieldDefinition>;
    }>;
  }>;

export type ReferenceTableFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "REFERENCE_TABLE";
    properties: Readonly<{
      referenceTable: Readonly<{
        relatedApp: Readonly<{ app: string }>;
        condition: Readonly<{
          field: FieldCode;
          relatedField: FieldCode;
        }>;
        filterCond?: string;
        displayFields: readonly FieldCode[];
        sort?: string;
        size?: string;
      }>;
    }>;
  }>;

// FieldDefinition union
export type FieldDefinition =
  | SingleLineTextFieldDefinition
  | MultiLineTextFieldDefinition
  | RichTextFieldDefinition
  | NumberFieldDefinition
  | CalcFieldDefinition
  | SelectionFieldDefinition
  | DateFieldDefinition
  | TimeFieldDefinition
  | DateTimeFieldDefinition
  | LinkFieldDefinition
  | UserSelectFieldDefinition
  | FileFieldDefinition
  | GroupFieldDefinition
  | SubtableFieldDefinition
  | ReferenceTableFieldDefinition;

// Layout-related types

export type ElementSize = Readonly<{
  width?: string;
  height?: string;
  innerHeight?: string;
}>;

export type LayoutElementType = "LABEL" | "SPACER" | "HR";

export type LabelElement = Readonly<{
  type: "LABEL";
  label: string;
  elementId: string;
  size: ElementSize;
}>;

export type SpacerElement = Readonly<{
  type: "SPACER";
  elementId: string;
  size: ElementSize;
}>;

export type HrElement = Readonly<{
  type: "HR";
  elementId: string;
  size: ElementSize;
}>;

export type DecorationElement = LabelElement | SpacerElement | HrElement;

export type LayoutField = Readonly<{
  field: FieldDefinition;
  size?: ElementSize;
}>;

export type SystemFieldLayout = Readonly<{
  code: string;
  type: string;
  size?: ElementSize;
}>;

export type LayoutElement = LayoutField | DecorationElement | SystemFieldLayout;
