import type { Schema } from "@/core/domain/formSchema/entity";
import type {
  FieldCode,
  FormSchemaThreeWayMerge,
} from "@/core/domain/formSchema/valueObject";

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

// --- pull / push DTOs ---

/**
 * Result of the first stage of `pull`. For the `merged` mode the merge is
 * returned (possibly with conflicts) so the CLI can resolve conflicts before
 * the local YAML / state are written by `applyPulledMerge`.
 */
export type PullSchemaOutput =
  | {
      readonly mode: "force";
      readonly schemaText: string;
    }
  | {
      readonly mode: "firstTime";
      readonly schemaText: string;
    }
  | {
      readonly mode: "merged";
      readonly merge: FormSchemaThreeWayMerge;
      readonly remoteRevision: string;
      readonly remoteSchema: Schema;
    };

export type PushSchemaOutput = {
  readonly mode: "push" | "firstTime";
  readonly revision: string;
};
