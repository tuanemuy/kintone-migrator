import { describe, expect, it } from "vitest";
import { deduplicateName } from "../deduplicateName";

const defaultOptions = { separator: "_", startCounter: 1 };

describe("deduplicateName", () => {
  it("returns baseName when not taken", () => {
    const used = new Set<string>();
    expect(deduplicateName("app", used, defaultOptions)).toBe("app");
    expect(used.has("app")).toBe(true);
  });

  it("appends counter when baseName is taken", () => {
    const used = new Set<string>(["app"]);
    expect(deduplicateName("app", used, defaultOptions)).toBe("app_1");
    expect(used.has("app_1")).toBe(true);
  });

  it("increments counter until a unique name is found", () => {
    const used = new Set<string>(["app", "app_1", "app_2"]);
    expect(deduplicateName("app", used, defaultOptions)).toBe("app_3");
  });

  it("uses custom separator and startCounter", () => {
    const used = new Set<string>(["app"]);
    expect(
      deduplicateName("app", used, { separator: "-", startCounter: 10 }),
    ).toBe("app-10");
  });

  it("throws when maxCounter is exceeded", () => {
    const used = new Set<string>(["app", "app_1", "app_2"]);
    expect(() =>
      deduplicateName("app", used, { ...defaultOptions, maxCounter: 2 }),
    ).toThrow("exceeded maximum counter (2)");
  });

  describe("input validation", () => {
    it("throws for empty baseName", () => {
      const used = new Set<string>();
      expect(() => deduplicateName("", used, defaultOptions)).toThrow(
        "baseName must not be empty",
      );
    });

    it("throws for empty separator", () => {
      const used = new Set<string>();
      expect(() =>
        deduplicateName("app", used, { separator: "", startCounter: 1 }),
      ).toThrow("separator must not be empty");
    });

    it("throws for startCounter less than 1", () => {
      const used = new Set<string>();
      expect(() =>
        deduplicateName("app", used, { separator: "_", startCounter: 0 }),
      ).toThrow("startCounter must be >= 1");
    });

    it("throws for negative startCounter", () => {
      const used = new Set<string>();
      expect(() =>
        deduplicateName("app", used, { separator: "_", startCounter: -5 }),
      ).toThrow("startCounter must be >= 1");
    });
  });
});
