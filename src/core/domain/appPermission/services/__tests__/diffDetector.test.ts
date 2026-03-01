import { describe, expect, it } from "vitest";
import type { AppPermissionConfig, AppRight } from "../../entity";
import { AppPermissionDiffDetector } from "../diffDetector";

function makeRight(overrides: Partial<AppRight> = {}): AppRight {
  return {
    entity: { type: "USER", code: "user1" },
    includeSubs: false,
    appEditable: false,
    recordViewable: true,
    recordAddable: false,
    recordEditable: false,
    recordDeletable: false,
    recordImportable: false,
    recordExportable: false,
    ...overrides,
  };
}

function makeConfig(rights: AppRight[] = []): AppPermissionConfig {
  return { rights };
}

describe("AppPermissionDiffDetector", () => {
  describe("no changes", () => {
    it("should return empty diff when configs are identical", () => {
      const local = makeConfig([makeRight()]);
      const remote = makeConfig([makeRight()]);
      const result = AppPermissionDiffDetector.detect(local, remote);
      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
    });

    it("should return empty diff when both are empty", () => {
      const result = AppPermissionDiffDetector.detect(
        makeConfig(),
        makeConfig(),
      );
      expect(result.isEmpty).toBe(true);
    });
  });

  describe("added entities", () => {
    it("should detect added entity", () => {
      const local = makeConfig([makeRight()]);
      const result = AppPermissionDiffDetector.detect(local, makeConfig());
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("added");
      expect(result.entries[0].entityKey).toBe("USER:user1");
      expect(result.summary.added).toBe(1);
    });
  });

  describe("deleted entities", () => {
    it("should detect deleted entity", () => {
      const remote = makeConfig([makeRight()]);
      const result = AppPermissionDiffDetector.detect(makeConfig(), remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("deleted");
      expect(result.summary.deleted).toBe(1);
    });
  });

  describe("modified entities", () => {
    it("should detect permission flag change", () => {
      const local = makeConfig([makeRight({ recordAddable: true })]);
      const remote = makeConfig([makeRight({ recordAddable: false })]);
      const result = AppPermissionDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].details).toContain("recordAddable");
    });

    it("should detect includeSubs change", () => {
      const local = makeConfig([makeRight({ includeSubs: true })]);
      const remote = makeConfig([makeRight({ includeSubs: false })]);
      const result = AppPermissionDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("includeSubs");
    });

    it("should detect multiple permission flags changed simultaneously", () => {
      const local = makeConfig([
        makeRight({ recordAddable: true, recordEditable: true }),
      ]);
      const remote = makeConfig([
        makeRight({ recordAddable: false, recordEditable: false }),
      ]);
      const result = AppPermissionDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].details).toContain("recordAddable");
      expect(result.entries[0].details).toContain("recordEditable");
    });
  });

  describe("multiple changes", () => {
    it("should detect added, modified, and deleted simultaneously", () => {
      const local = makeConfig([
        makeRight({ recordAddable: true }),
        makeRight({
          entity: { type: "GROUP", code: "newgroup" },
        }),
      ]);
      const remote = makeConfig([
        makeRight({ recordAddable: false }),
        makeRight({
          entity: { type: "ORGANIZATION", code: "oldorg" },
        }),
      ]);
      const result = AppPermissionDiffDetector.detect(local, remote);
      expect(result.summary.added).toBe(1);
      expect(result.summary.modified).toBe(1);
      expect(result.summary.deleted).toBe(1);
      expect(result.summary.total).toBe(3);
    });
  });
});
