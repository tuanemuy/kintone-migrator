import type { FieldCode } from "@/core/domain/formSchema/valueObject";

export type DiffEntryDto = {
  readonly type: "added" | "modified" | "deleted";
  readonly fieldCode: FieldCode;
  readonly fieldLabel: string;
  readonly details: string;
  readonly before?: {
    readonly code: FieldCode;
    readonly type: string;
    readonly label: string;
    readonly properties: Record<string, unknown>;
  };
  readonly after?: {
    readonly code: FieldCode;
    readonly type: string;
    readonly label: string;
    readonly properties: Record<string, unknown>;
  };
};

export type SchemaFieldDto = {
  readonly fieldCode: FieldCode;
  readonly fieldLabel: string;
  readonly fieldType: string;
};

export type DetectDiffOutput = {
  readonly entries: readonly DiffEntryDto[];
  readonly schemaFields: readonly SchemaFieldDto[];
  readonly summary: {
    readonly added: number;
    readonly modified: number;
    readonly deleted: number;
    readonly total: number;
  };
  readonly isEmpty: boolean;
  readonly hasLayoutChanges: boolean;
};

export type CaptureSchemaOutput = {
  readonly schemaText: string;
  readonly hasExistingSchema: boolean;
};
