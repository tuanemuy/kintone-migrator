import { describe, expect, it } from "vitest";
import type { ProcessManagementConfig } from "../../entity";
import type { ProcessAction } from "../../valueObject";
import { computeProcessManagementThreeWayMerge } from "../processManagementMerge";

function action(name: string, to: string): ProcessAction {
  return { name, from: "未処理", to, filterCond: "", type: "PRIMARY" };
}

const approve = action("承認", "完了");
const reject = action("却下", "却下済み");
const withdraw = action("取り下げ", "取り下げ済み");

function cfg(...actions: ProcessAction[]): ProcessManagementConfig {
  return { enable: true, states: {}, actions };
}

describe("computeProcessManagementThreeWayMerge", () => {
  const base = cfg(approve, reject, withdraw);

  it("classifies unchanged order as unchanged", () => {
    const merge = computeProcessManagementThreeWayMerge(base, base, base);

    expect(merge.change.kind).toBe("unchanged");
  });

  it("classifies a remote-only reorder as remoteOnly", () => {
    const remote = cfg(withdraw, approve, reject);

    const merge = computeProcessManagementThreeWayMerge(base, base, remote);

    expect(merge.change.kind).toBe("remoteOnly");
    expect(merge.merged).toEqual(remote);
  });

  it("classifies a local-only reorder as localOnly", () => {
    const local = cfg(withdraw, approve, reject);

    const merge = computeProcessManagementThreeWayMerge(base, local, base);

    expect(merge.change.kind).toBe("localOnly");
    expect(merge.merged).toEqual(local);
  });

  it("classifies the same reorder on both sides as bothSame", () => {
    const reordered = cfg(withdraw, approve, reject);

    const merge = computeProcessManagementThreeWayMerge(
      base,
      reordered,
      cfg(withdraw, approve, reject),
    );

    expect(merge.change.kind).toBe("bothSame");
    expect(merge.merged).toEqual(reordered);
  });

  it("classifies different reorders on each side as conflict", () => {
    const merge = computeProcessManagementThreeWayMerge(
      base,
      cfg(withdraw, approve, reject),
      cfg(reject, approve, withdraw),
    );

    expect(merge.change.kind).toBe("conflict");
  });
});
