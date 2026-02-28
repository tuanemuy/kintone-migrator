import { describe, expect, it } from "vitest";
import type { FieldPermissionConfig, FieldRight } from "../../entity";
import { FieldPermissionDiffDetector } from "../diffDetector";

function makeRight(
  code: string,
  overrides: Partial<Omit<FieldRight, "code">> = {},
): FieldRight {
  return {
    code,
    entities: [
      {
        accessibility: "READ",
        entity: { type: "USER", code: "user1" },
      },
    ],
    ...overrides,
  };
}

function makeConfig(rights: FieldRight[] = []): FieldPermissionConfig {
  return { rights };
}

describe("FieldPermissionDiffDetector", () => {
  describe("no changes", () => {
    it("should return empty diff when configs are identical", () => {
      const config = makeConfig([makeRight("field1")]);
      const result = FieldPermissionDiffDetector.detect(config, config);
      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
    });

    it("should return empty diff when both are empty", () => {
      const result = FieldPermissionDiffDetector.detect(
        makeConfig(),
        makeConfig(),
      );
      expect(result.isEmpty).toBe(true);
    });
  });

  describe("added fields", () => {
    it("should detect added field code", () => {
      const local = makeConfig([makeRight("field1")]);
      const result = FieldPermissionDiffDetector.detect(local, makeConfig());
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("added");
      expect(result.entries[0].fieldCode).toBe("field1");
      expect(result.summary.added).toBe(1);
    });
  });

  describe("deleted fields", () => {
    it("should detect deleted field code", () => {
      const remote = makeConfig([makeRight("field1")]);
      const result = FieldPermissionDiffDetector.detect(makeConfig(), remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("deleted");
      expect(result.entries[0].fieldCode).toBe("field1");
      expect(result.summary.deleted).toBe(1);
    });
  });

  describe("modified fields", () => {
    it("should detect accessibility change", () => {
      const local = makeConfig([
        makeRight("field1", {
          entities: [
            {
              accessibility: "WRITE",
              entity: { type: "USER", code: "user1" },
            },
          ],
        }),
      ]);
      const remote = makeConfig([
        makeRight("field1", {
          entities: [
            {
              accessibility: "READ",
              entity: { type: "USER", code: "user1" },
            },
          ],
        }),
      ]);
      const result = FieldPermissionDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].details).toContain("entities changed");
    });

    it("should detect includeSubs change", () => {
      const local = makeConfig([
        makeRight("field1", {
          entities: [
            {
              accessibility: "READ",
              entity: { type: "USER", code: "user1" },
              includeSubs: true,
            },
          ],
        }),
      ]);
      const remote = makeConfig([
        makeRight("field1", {
          entities: [
            {
              accessibility: "READ",
              entity: { type: "USER", code: "user1" },
              includeSubs: false,
            },
          ],
        }),
      ]);
      const result = FieldPermissionDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].details).toContain("entities changed");
    });
  });

  describe("multiple changes", () => {
    it("should detect added, modified, and deleted simultaneously", () => {
      const local = makeConfig([
        makeRight("field1", {
          entities: [
            {
              accessibility: "WRITE",
              entity: { type: "USER", code: "user1" },
            },
          ],
        }),
        makeRight("field_new"),
      ]);
      const remote = makeConfig([makeRight("field1"), makeRight("field_old")]);
      const result = FieldPermissionDiffDetector.detect(local, remote);
      expect(result.summary.added).toBe(1);
      expect(result.summary.modified).toBe(1);
      expect(result.summary.deleted).toBe(1);
      expect(result.summary.total).toBe(3);
    });
  });
});
