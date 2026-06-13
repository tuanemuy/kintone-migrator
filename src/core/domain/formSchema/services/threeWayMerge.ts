import { BusinessRuleError } from "@/core/domain/error";
import { classifyThreeWay } from "../../diff";
import { Schema } from "../entity";
import { FormSchemaErrorCode } from "../errorCode";
import type {
  FieldCode,
  FieldDefinition,
  FormSchemaThreeWayMerge,
  MergeResolution,
} from "../valueObject";
import { isFieldEqual, isLayoutEqual } from "./diffDetector";
import {
  collectSubtableInnerFieldCodes,
  enrichLayoutWithFields,
} from "./layoutEnricher";

/**
 * Normalizes a field map so that base/local/remote share the same population
 * before 3-way classification (ADR-007).
 *
 * - Subtable inner fields are removed from the top level: a subtable is treated
 *   as a single entity (its inner Map is compared whole by `isFieldEqual`).
 * - GROUP definitions are removed from the field channel: GROUP structural
 *   changes surface via the layout channel.
 *
 * `getFields()` (remote) already excludes system fields and flattens subtable
 * inner fields to the top level; parsed local/base schemas include GROUP and
 * subtable inner definitions. Running all three through this normalization
 * aligns their populations so classification compares like-with-like.
 */
export function normalizeForThreeWay(
  fields: ReadonlyMap<FieldCode, FieldDefinition>,
): ReadonlyMap<FieldCode, FieldDefinition> {
  const innerCodes = collectSubtableInnerFieldCodes(fields);
  const normalized = new Map<FieldCode, FieldDefinition>();
  for (const [code, def] of fields) {
    if (def.type === "GROUP") continue;
    if (innerCodes.has(code)) continue;
    normalized.set(code, def);
  }
  return normalized;
}

/**
 * Computes a 3-way merge of two form schemas against a common base.
 *
 * Fields are classified per-entity over the normalized field channel; layout
 * is coarse-grained (single conflict flag, ADR-003). GROUP/subtable-inner are
 * excluded from the field channel and reconstructed from the chosen layout in
 * {@link resolveMerge}.
 */
export function computeThreeWayMerge(
  base: Schema,
  local: Schema,
  remote: Schema,
): FormSchemaThreeWayMerge {
  const baseFieldsNorm = normalizeForThreeWay(base.fields);
  const localFieldsNorm = normalizeForThreeWay(local.fields);
  const remoteFieldsNorm = normalizeForThreeWay(remote.fields);

  const fieldResult = classifyThreeWay<FieldCode, FieldDefinition>(
    baseFieldsNorm,
    localFieldsNorm,
    remoteFieldsNorm,
    isFieldEqual,
  );

  const enrichedBaseLayout = enrichLayoutWithFields(base.layout, base.fields);
  const enrichedLocalLayout = enrichLayoutWithFields(
    local.layout,
    local.fields,
  );
  const enrichedRemoteLayout = enrichLayoutWithFields(
    remote.layout,
    remote.fields,
  );

  const layoutLocalChanged = !isLayoutEqual(
    enrichedBaseLayout,
    enrichedLocalLayout,
  );
  const layoutRemoteChanged = !isLayoutEqual(
    enrichedBaseLayout,
    enrichedRemoteLayout,
  );

  let layoutConflict = false;
  let mergedLayout: Schema["layout"] | undefined;
  let layoutAutoSide: "local" | "remote" | "base" | undefined;
  if (layoutLocalChanged && layoutRemoteChanged) {
    if (isLayoutEqual(enrichedLocalLayout, enrichedRemoteLayout)) {
      mergedLayout = enrichedLocalLayout;
      layoutAutoSide = "local";
    } else {
      layoutConflict = true;
    }
  } else if (layoutLocalChanged) {
    mergedLayout = enrichedLocalLayout;
    layoutAutoSide = "local";
  } else if (layoutRemoteChanged) {
    mergedLayout = enrichedRemoteLayout;
    layoutAutoSide = "remote";
  } else {
    mergedLayout = enrichedBaseLayout;
    layoutAutoSide = "base";
  }

  return {
    fieldEntries: fieldResult.entries,
    fieldConflicts: fieldResult.conflicts,
    layoutConflict,
    baseLayout: enrichedBaseLayout,
    localLayout: enrichedLocalLayout,
    remoteLayout: enrichedRemoteLayout,
    ...(mergedLayout !== undefined ? { mergedLayout } : {}),
    ...(layoutAutoSide !== undefined ? { layoutAutoSide } : {}),
    hasConflict: fieldResult.hasConflict || layoutConflict,
    baseFields: base.fields,
    localFields: local.fields,
    remoteFields: remote.fields,
  };
}

/**
 * Reconstructs the merged {@link Schema} after conflicts have been resolved.
 *
 * The chosen layout (local/remote on conflict, otherwise the auto-merged
 * layout) determines the structure. GROUP/subtable-inner definitions that were
 * excluded from the field channel are reconstructed from the field map that
 * corresponds to the chosen layout, so the result is internally consistent.
 *
 * @throws when `resolution` does not cover every field conflict, or when the
 *   layout resolution is inconsistent with `layoutConflict`.
 */
export function resolveMerge(
  merge: FormSchemaThreeWayMerge,
  resolution: MergeResolution,
): Schema {
  assertResolutionCovers(merge, resolution);

  // Choose the layout source and its corresponding full field map. The full
  // field map carries GROUP/subtable-inner definitions for the structure that
  // matches the chosen layout.
  const layoutSide: "local" | "remote" = merge.layoutConflict
    ? (resolution.layout as "local" | "remote")
    : layoutAutoSide(merge);

  const chosenLayout =
    layoutSide === "local" ? merge.localLayout : merge.remoteLayout;
  const chosenSideFields =
    layoutSide === "local" ? merge.localFields : merge.remoteFields;

  // Start from the chosen side's full field map (includes GROUP / subtable
  // inner), then overlay the merged top-level field channel decisions.
  const mergedFields = new Map<FieldCode, FieldDefinition>(chosenSideFields);
  for (const entry of merge.fieldEntries) {
    overlayFieldEntry(
      mergedFields,
      entry,
      resolveFieldEntry(entry, resolution),
    );
  }

  return Schema.create(mergedFields, chosenLayout);
}

function assertResolutionCovers(
  merge: FormSchemaThreeWayMerge,
  resolution: MergeResolution,
): void {
  // These are programmer invariants (the CLI must produce a resolution that
  // covers every conflict). They are domain-rule violations, so throw a
  // BusinessRuleError that the application layer translates to a ValidationError
  // via wrapBusinessRuleError (CLAUDE.md error policy).
  for (const conflict of merge.fieldConflicts) {
    if (!resolution.fields.has(conflict.key)) {
      throw new BusinessRuleError(
        FormSchemaErrorCode.FsInvalidMergeResolution,
        `Merge resolution missing field conflict: ${conflict.key}`,
      );
    }
  }
  if (
    merge.layoutConflict &&
    resolution.layout !== "local" &&
    resolution.layout !== "remote"
  ) {
    throw new BusinessRuleError(
      FormSchemaErrorCode.FsInvalidMergeResolution,
      "Merge resolution must choose a layout side for the layout conflict",
    );
  }
}

function dropSubtableInner(
  fields: Map<FieldCode, FieldDefinition>,
  code: FieldCode,
): void {
  const existing = fields.get(code);
  if (existing?.type === "SUBTABLE") {
    for (const innerCode of existing.properties.fields.keys()) {
      fields.delete(innerCode);
    }
  }
}

// Overlays a single field-channel decision onto the merged field map, keeping
// subtable inner top-level entries consistent with the chosen definition.
function overlayFieldEntry(
  mergedFields: Map<FieldCode, FieldDefinition>,
  entry: FormSchemaThreeWayMerge["fieldEntries"][number],
  resolved: FieldDefinition | undefined,
): void {
  dropSubtableInner(mergedFields, entry.key);
  if (resolved === undefined) {
    mergedFields.delete(entry.key);
    return;
  }
  mergedFields.set(entry.key, resolved);
  if (resolved.type === "SUBTABLE") {
    for (const [innerCode, innerDef] of resolved.properties.fields) {
      mergedFields.set(innerCode, innerDef);
    }
  }
}

function layoutAutoSide(merge: FormSchemaThreeWayMerge): "local" | "remote" {
  // Read the explicit side flag set by computeThreeWayMerge rather than relying
  // on reference equality of mergedLayout (W-001). When neither side changed
  // ("base"), all three layouts are equal, so "local" reconstructs an
  // equivalent field map.
  return merge.layoutAutoSide === "remote" ? "remote" : "local";
}

function resolveFieldEntry(
  entry: FormSchemaThreeWayMerge["fieldEntries"][number],
  resolution: MergeResolution,
): FieldDefinition | undefined {
  switch (entry.change.kind) {
    case "unchanged":
    case "localOnly":
    case "bothSame":
      return entry.merged;
    case "remoteOnly":
      return entry.merged;
    case "conflict": {
      const side = resolution.fields.get(entry.key);
      return side === "remote" ? entry.remote : entry.local;
    }
  }
}
