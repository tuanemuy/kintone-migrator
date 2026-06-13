import { describe, expect, it } from "vitest";
import { ConflictError, ConflictErrorCode } from "../../error";
import { buildDriftConflict, buildDriftMessage } from "../driftConflict";

describe("threeWay driftConflict", () => {
  it("drift メッセージは pull コマンド名を埋め込んで案内する", () => {
    expect(buildDriftMessage("view pull")).toContain("view pull");
    expect(buildDriftMessage("view pull")).toContain(
      "changed since the base snapshot",
    );
  });

  it("ConfigDrift コードの ConflictError を生成する", () => {
    const error = buildDriftConflict("view pull");
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.code).toBe(ConflictErrorCode.ConfigDrift);
    expect(error.code).not.toBe(ConflictErrorCode.Conflict);
    expect(error.message).toContain("view pull");
  });
});
