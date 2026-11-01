import { describe, expect, it } from "vitest";
import { DeployStateEvaluator } from "../deployStateEvaluator";

describe("DeployStateEvaluator.evaluate", () => {
  it("preview と published の revision が一致すれば upToDate を返す", () => {
    expect(
      DeployStateEvaluator.evaluate({
        preview: "7",
        published: { kind: "deployed", revision: "7" },
      }),
    ).toEqual({ kind: "upToDate", revision: "7" });
  });

  it("preview が published より進んでいれば両方の revision を持つ pending を返す", () => {
    expect(
      DeployStateEvaluator.evaluate({
        preview: "8",
        published: { kind: "deployed", revision: "7" },
      }),
    ).toEqual({
      kind: "pending",
      previewRevision: "8",
      publishedRevision: "7",
    });
  });

  it("revision は数値ではなく文字列として比べる（桁数が違えば pending）", () => {
    expect(
      DeployStateEvaluator.evaluate({
        preview: "10",
        published: { kind: "deployed", revision: "9" },
      }),
    ).toEqual({
      kind: "pending",
      previewRevision: "10",
      publishedRevision: "9",
    });
  });

  it("published が無ければ preview の revision を持つ neverDeployed を返す", () => {
    expect(
      DeployStateEvaluator.evaluate({
        preview: "2",
        published: { kind: "neverDeployed" },
      }),
    ).toEqual({ kind: "neverDeployed", previewRevision: "2" });
  });
});

describe("DeployStateEvaluator.hasUndeployedChanges", () => {
  it("upToDate は false", () => {
    expect(
      DeployStateEvaluator.hasUndeployedChanges({
        kind: "upToDate",
        revision: "7",
      }),
    ).toBe(false);
  });

  it("pending は true", () => {
    expect(
      DeployStateEvaluator.hasUndeployedChanges({
        kind: "pending",
        previewRevision: "8",
        publishedRevision: "7",
      }),
    ).toBe(true);
  });

  it("neverDeployed は true（deploy で設定全体が公開される）", () => {
    expect(
      DeployStateEvaluator.hasUndeployedChanges({
        kind: "neverDeployed",
        previewRevision: "2",
      }),
    ).toBe(true);
  });
});
