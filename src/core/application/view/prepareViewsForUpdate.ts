import type { ViewConfig } from "@/core/domain/view/entity";

/**
 * Filters the views to send to `updateViews`, matching `applyView`'s builtin
 * handling: local builtin views are dropped (they cannot be updated) and remote
 * builtin views are preserved so the replacement does not delete them.
 *
 * Returns the views to send plus the names of skipped local builtin views.
 * Shared by `applyView` and `pushView` so both treat builtin views identically.
 */
export function prepareViewsForUpdate(
  desired: Readonly<Record<string, ViewConfig>>,
  remote: Readonly<Record<string, ViewConfig>>,
): {
  views: Record<string, ViewConfig>;
  skippedBuiltinViews: string[];
} {
  const skippedBuiltinViews: string[] = [];
  const views: Record<string, ViewConfig> = {};

  for (const [name, view] of Object.entries(desired)) {
    if (view.builtinType !== undefined) {
      skippedBuiltinViews.push(name);
    } else {
      views[name] = view;
    }
  }

  // Preserve remote builtinType views so the full-list replacement keeps them.
  // A local non-builtin view of the same name takes precedence (unlikely in
  // practice since builtinType names are system-assigned).
  for (const [name, view] of Object.entries(remote)) {
    if (view.builtinType !== undefined && views[name] === undefined) {
      views[name] = view;
    }
  }

  return { views, skippedBuiltinViews };
}
