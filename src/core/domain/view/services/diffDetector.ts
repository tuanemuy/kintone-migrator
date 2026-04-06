import { deepEqual } from "@/lib/deepEqual";
import { buildDiffResult } from "../../diff";
import { detectRecordDiff } from "../../services/recordDiffDetector";
import type { ViewConfig } from "../entity";
import type { ViewDiff, ViewDiffEntry } from "../valueObject";

function checkOptionalStringChange(
  changes: string[],
  field: string,
  localVal: string | undefined,
  remoteVal: string | undefined,
): void {
  if ((localVal ?? "") !== (remoteVal ?? "")) {
    changes.push(`${field} changed`);
  }
}

function describeChanges(local: ViewConfig, remote: ViewConfig): string[] {
  const changes: string[] = [];

  if (local.type !== remote.type) {
    changes.push(`type: ${remote.type} -> ${local.type}`);
  }

  // kintone API returns "" for non-builtin views, so undefined and "" are treated as equivalent
  checkOptionalStringChange(
    changes,
    "builtinType",
    local.builtinType,
    remote.builtinType,
  );

  if (local.index !== remote.index) {
    changes.push(`index: ${remote.index} -> ${local.index}`);
  }

  checkOptionalStringChange(
    changes,
    "filterCond",
    local.filterCond,
    remote.filterCond,
  );
  checkOptionalStringChange(changes, "sort", local.sort, remote.sort);
  checkOptionalStringChange(changes, "date", local.date, remote.date);
  checkOptionalStringChange(changes, "title", local.title, remote.title);
  checkOptionalStringChange(changes, "html", local.html, remote.html);

  if ((local.pager ?? false) !== (remote.pager ?? false)) {
    changes.push(
      `pager: ${String(remote.pager ?? false)} -> ${String(local.pager ?? false)}`,
    );
  }

  checkOptionalStringChange(changes, "device", local.device, remote.device);

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
    const entries = detectRecordDiff<ViewConfig, ViewDiffEntry>(
      localViews,
      remoteViews,
      {
        onAdded: (name, localView) => ({
          type: "added",
          viewName: name,
          details: `new ${localView.type} view`,
        }),
        onModified: (name, localView, remoteView) => {
          const changes = describeChanges(localView, remoteView);
          if (changes.length > 0) {
            return {
              type: "modified",
              viewName: name,
              details: changes.join(", "),
            };
          }
          return undefined;
        },
        onDeleted: (name, remoteView) => ({
          type: "deleted",
          viewName: name,
          details: `removed ${remoteView.type} view`,
        }),
      },
    );

    return buildDiffResult(entries);
  },
};
