import type { ViewConfig } from "../entity";
import type { ViewDiff, ViewDiffEntry } from "../valueObject";

function isArrayEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function describeChanges(local: ViewConfig, remote: ViewConfig): string {
  const changes: string[] = [];

  if (local.type !== remote.type) {
    changes.push(`type: ${remote.type} -> ${local.type}`);
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

  if (local.pager !== remote.pager) {
    changes.push(
      `pager: ${String(remote.pager ?? "undefined")} -> ${String(local.pager ?? "undefined")}`,
    );
  }

  if ((local.device ?? "") !== (remote.device ?? "")) {
    changes.push("device changed");
  }

  const localFields = local.fields ?? [];
  const remoteFields = remote.fields ?? [];
  if (!isArrayEqual(localFields, remoteFields)) {
    changes.push("fields changed");
  }

  return changes.length > 0 ? changes.join(", ") : "no visible changes";
}

function isViewEqual(local: ViewConfig, remote: ViewConfig): boolean {
  if (local.type !== remote.type) return false;
  if (local.index !== remote.index) return false;
  if ((local.filterCond ?? "") !== (remote.filterCond ?? "")) return false;
  if ((local.sort ?? "") !== (remote.sort ?? "")) return false;
  if ((local.date ?? "") !== (remote.date ?? "")) return false;
  if ((local.title ?? "") !== (remote.title ?? "")) return false;
  if ((local.html ?? "") !== (remote.html ?? "")) return false;
  if (local.pager !== remote.pager) return false;
  if ((local.device ?? "") !== (remote.device ?? "")) return false;

  const localFields = local.fields ?? [];
  const remoteFields = remote.fields ?? [];
  if (!isArrayEqual(localFields, remoteFields)) return false;

  return true;
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
      } else if (!isViewEqual(localView, remoteView)) {
        entries.push({
          type: "modified",
          viewName: name,
          details: describeChanges(localView, remoteView),
        });
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

    const added = entries.filter((e) => e.type === "added").length;
    const modified = entries.filter((e) => e.type === "modified").length;
    const deleted = entries.filter((e) => e.type === "deleted").length;

    return {
      entries,
      summary: {
        added,
        modified,
        deleted,
        total: added + modified + deleted,
      },
      isEmpty: entries.length === 0,
    };
  },
};
