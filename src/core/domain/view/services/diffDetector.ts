import { deepEqual } from "@/lib/deepEqual";
import { buildDiffResult } from "../../diff";
import type { ViewConfig } from "../entity";
import type { ViewDiff, ViewDiffEntry } from "../valueObject";

function describeChanges(local: ViewConfig, remote: ViewConfig): string[] {
  const changes: string[] = [];

  if (local.name !== remote.name) {
    changes.push(`name: "${remote.name}" -> "${local.name}"`);
  }

  if (local.type !== remote.type) {
    changes.push(`type: ${remote.type} -> ${local.type}`);
  }

  // kintone API returns "" for non-builtin views, so undefined and "" are treated as equivalent
  if ((local.builtinType ?? "") !== (remote.builtinType ?? "")) {
    changes.push("builtinType changed");
  }

  if (local.index !== remote.index) {
    changes.push(`index: ${remote.index} -> ${local.index}`);
  }

  if ((local.filterCond ?? "") !== (remote.filterCond ?? "")) {
    changes.push("filterCond changed");
  }

  if ((local.sort ?? "") !== (remote.sort ?? "")) {
    changes.push("sort changed");
  }

  if ((local.date ?? "") !== (remote.date ?? "")) {
    changes.push("date changed");
  }

  if ((local.title ?? "") !== (remote.title ?? "")) {
    changes.push("title changed");
  }

  if ((local.html ?? "") !== (remote.html ?? "")) {
    changes.push("html changed");
  }

  if ((local.pager ?? false) !== (remote.pager ?? false)) {
    changes.push(
      `pager: ${String(remote.pager ?? false)} -> ${String(local.pager ?? false)}`,
    );
  }

  if ((local.device ?? "") !== (remote.device ?? "")) {
    changes.push("device changed");
  }

  if (!deepEqual(local.fields ?? [], remote.fields ?? [])) {
    changes.push("fields changed");
  }

  return changes;
}

export const ViewDiffDetector = {
  detect: (
    localViews: Readonly<Record<string, ViewConfig>>,
    remoteViews: Readonly<Record<string, ViewConfig>>,
  ): ViewDiff => {
    const entries: ViewDiffEntry[] = [];

    for (const [name, localView] of Object.entries(localViews)) {
      const remoteView = remoteViews[name];

      if (remoteView === undefined) {
        entries.push({
          type: "added",
          viewName: name,
          details: "new view",
        });
      } else {
        const changes = describeChanges(localView, remoteView);
        if (changes.length > 0) {
          entries.push({
            type: "modified",
            viewName: name,
            details: changes.join(", "),
          });
        }
      }
    }

    for (const name of Object.keys(remoteViews)) {
      if (localViews[name] === undefined) {
        entries.push({
          type: "deleted",
          viewName: name,
          details: "deleted",
        });
      }
    }

    return buildDiffResult(entries);
  },
};
