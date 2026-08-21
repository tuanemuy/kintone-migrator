import { describe, expect, it } from "vitest";
import { BusinessRuleError, isBusinessRuleError } from "@/core/domain/error";
import { CustomizationErrorCode } from "../../errorCode";
import { CustomizationStateParser } from "../customizationStateParser";

const DIGEST =
  "sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";

describe("CustomizationStateParser", () => {
  it("collects per-FILE digests keyed by the merge resource key", () => {
    const state = CustomizationStateParser.parse({
      scope: "ALL",
      desktop: {
        js: [{ type: "FILE", path: "app/desktop/js/a.js", digest: DIGEST }],
        css: [{ type: "URL", url: "https://cdn.example.com/style.css" }],
      },
      mobile: {
        js: [{ type: "FILE", path: "app/mobile/js/a.js", digest: DIGEST }],
      },
    });

    expect(state.config.desktop.js).toEqual([
      { type: "FILE", path: "app/desktop/js/a.js" },
    ]);
    expect([...state.fileDigests.entries()].sort()).toEqual([
      ["desktop:js:a.js", DIGEST],
      ["mobile:js:a.js", DIGEST],
    ]);
  });

  it("parses a state without any digest as an empty digest map (legacy state)", () => {
    const state = CustomizationStateParser.parse({
      scope: "ALL",
      desktop: { js: [{ type: "FILE", path: "a.js" }] },
    });

    expect(state.config.desktop.js).toHaveLength(1);
    expect(state.fileDigests.size).toBe(0);
  });

  it("records digests only for the FILE entries that carry one", () => {
    const state = CustomizationStateParser.parse({
      scope: "ALL",
      desktop: {
        js: [
          { type: "FILE", path: "a.js", digest: DIGEST },
          { type: "FILE", path: "b.js" },
        ],
      },
    });

    expect(state.fileDigests.get("desktop:js:a.js")).toBe(DIGEST);
    expect(state.fileDigests.has("desktop:js:b.js")).toBe(false);
  });

  it.each([
    ["a non-string", 123],
    ["an empty string", ""],
    ["a bare prefix", "sha256:"],
    ["another algorithm", "md5:abcdef"],
  ])("rejects %s digest", (_label, digest) => {
    const parse = () =>
      CustomizationStateParser.parse({
        scope: "ALL",
        desktop: { js: [{ type: "FILE", path: "a.js", digest }] },
      });

    expect(parse).toThrow(BusinessRuleError);
    try {
      parse();
    } catch (error) {
      expect(isBusinessRuleError(error) && error.code).toBe(
        CustomizationErrorCode.CzInvalidConfigStructure,
      );
    }
  });
});
