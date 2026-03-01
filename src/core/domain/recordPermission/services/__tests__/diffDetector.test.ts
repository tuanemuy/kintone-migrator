import { describe, expect, it } from "vitest";
import type { RecordPermissionConfig, RecordRight } from "../../entity";
import { RecordPermissionDiffDetector } from "../diffDetector";

function makeRight(overrides: Partial<RecordRight> = {}): RecordRight {
  return {
    filterCond: 'status = "active"',
    entities: [
      {
        entity: { type: "USER", code: "user1" },
        viewable: true,
        editable: false,
        deletable: false,
        includeSubs: false,
      },
    ],
    ...overrides,
  };
}

function makeConfig(rights: RecordRight[] = []): RecordPermissionConfig {
  return { rights };
}

describe("RecordPermissionDiffDetector", () => {
  describe("no changes", () => {
    it("should return empty diff when configs are identical", () => {
      const local = makeConfig([makeRight()]);
      const remote = makeConfig([makeRight()]);
      const result = RecordPermissionDiffDetector.detect(local, remote);
      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
    });

    it("should return empty diff when both are empty", () => {
      const result = RecordPermissionDiffDetector.detect(
        makeConfig(),
        makeConfig(),
      );
      expect(result.isEmpty).toBe(true);
    });
  });

  describe("added rules", () => {
    it("should detect added rule by filterCond", () => {
      const local = makeConfig([makeRight()]);
      const result = RecordPermissionDiffDetector.detect(local, makeConfig());
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("added");
      expect(result.entries[0].filterCond).toBe('status = "active"');
      expect(result.summary.added).toBe(1);
    });
  });

  describe("deleted rules", () => {
    it("should detect deleted rule by filterCond", () => {
      const remote = makeConfig([makeRight()]);
      const result = RecordPermissionDiffDetector.detect(makeConfig(), remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("deleted");
      expect(result.entries[0].filterCond).toBe('status = "active"');
      expect(result.summary.deleted).toBe(1);
    });
  });

  describe("modified rules", () => {
    it("should detect entities change", () => {
      const local = makeConfig([
        makeRight({
          entities: [
            {
              entity: { type: "USER", code: "user1" },
              viewable: true,
              editable: true,
              deletable: false,
              includeSubs: false,
            },
          ],
        }),
      ]);
      const remote = makeConfig([
        makeRight({
          entities: [
            {
              entity: { type: "USER", code: "user1" },
              viewable: true,
              editable: false,
              deletable: false,
              includeSubs: false,
            },
          ],
        }),
      ]);
      const result = RecordPermissionDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].details).toContain("entities changed");
    });

    it("should detect entity count change", () => {
      const local = makeConfig([
        makeRight({
          entities: [
            {
              entity: { type: "USER", code: "user1" },
              viewable: true,
              editable: false,
              deletable: false,
              includeSubs: false,
            },
            {
              entity: { type: "GROUP", code: "group1" },
              viewable: true,
              editable: false,
              deletable: false,
              includeSubs: false,
            },
          ],
        }),
      ]);
      const remote = makeConfig([makeRight()]);
      const result = RecordPermissionDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].details).toContain("1 -> 2");
    });
  });

  describe("filterCond-based comparison (order independent)", () => {
    it("should match rules by filterCond regardless of order", () => {
      const ruleA = makeRight({ filterCond: "a = 1" });
      const ruleB = makeRight({ filterCond: "b = 2" });

      const local = makeConfig([ruleB, ruleA]);
      const remote = makeConfig([ruleA, ruleB]);

      const result = RecordPermissionDiffDetector.detect(local, remote);
      expect(result.isEmpty).toBe(true);
    });

    it("should detect correct changes regardless of order", () => {
      const local = makeConfig([
        makeRight({ filterCond: "b = 2" }),
        makeRight({ filterCond: "c = 3" }),
      ]);
      const remote = makeConfig([
        makeRight({ filterCond: "a = 1" }),
        makeRight({ filterCond: "b = 2" }),
      ]);
      const result = RecordPermissionDiffDetector.detect(local, remote);
      expect(result.summary.added).toBe(1);
      expect(result.summary.deleted).toBe(1);
      expect(result.summary.total).toBe(2);
    });
  });

  describe("duplicate filterCond handling", () => {
    it("should handle multiple rules with the same filterCond", () => {
      const local = makeConfig([
        makeRight({
          filterCond: "",
          entities: [
            {
              entity: { type: "USER", code: "user1" },
              viewable: true,
              editable: false,
              deletable: false,
              includeSubs: false,
            },
          ],
        }),
        makeRight({
          filterCond: "",
          entities: [
            {
              entity: { type: "GROUP", code: "group1" },
              viewable: true,
              editable: true,
              deletable: false,
              includeSubs: false,
            },
          ],
        }),
      ]);
      const remote = makeConfig([
        makeRight({
          filterCond: "",
          entities: [
            {
              entity: { type: "USER", code: "user1" },
              viewable: true,
              editable: false,
              deletable: false,
              includeSubs: false,
            },
          ],
        }),
        makeRight({
          filterCond: "",
          entities: [
            {
              entity: { type: "GROUP", code: "group1" },
              viewable: true,
              editable: true,
              deletable: false,
              includeSubs: false,
            },
          ],
        }),
      ]);
      const result = RecordPermissionDiffDetector.detect(local, remote);
      expect(result.isEmpty).toBe(true);
    });

    it("should detect added rule among duplicate filterConds", () => {
      const local = makeConfig([
        makeRight({ filterCond: "" }),
        makeRight({ filterCond: "" }),
      ]);
      const remote = makeConfig([makeRight({ filterCond: "" })]);
      const result = RecordPermissionDiffDetector.detect(local, remote);
      expect(result.summary.added).toBe(1);
    });

    it("should detect deleted rule among duplicate filterConds", () => {
      const local = makeConfig([makeRight({ filterCond: "" })]);
      const remote = makeConfig([
        makeRight({ filterCond: "" }),
        makeRight({ filterCond: "" }),
      ]);
      const result = RecordPermissionDiffDetector.detect(local, remote);
      expect(result.summary.deleted).toBe(1);
    });
  });

  describe("reordering within same filterCond group", () => {
    it("should report modified when rules with same filterCond are reordered", () => {
      const ruleA = makeRight({
        filterCond: "",
        entities: [
          {
            entity: { type: "USER", code: "user1" },
            viewable: true,
            editable: false,
            deletable: false,
            includeSubs: false,
          },
        ],
      });
      const ruleB = makeRight({
        filterCond: "",
        entities: [
          {
            entity: { type: "GROUP", code: "group1" },
            viewable: true,
            editable: true,
            deletable: false,
            includeSubs: false,
          },
        ],
      });
      const local = makeConfig([ruleB, ruleA]);
      const remote = makeConfig([ruleA, ruleB]);
      const result = RecordPermissionDiffDetector.detect(local, remote);
      // Position-based matching within the same filterCond group: reordering is detected as modifications
      expect(result.summary.modified).toBe(2);
    });
  });

  describe("empty filterCond", () => {
    it("should handle empty string filterCond", () => {
      const local = makeConfig([makeRight({ filterCond: "" })]);
      const result = RecordPermissionDiffDetector.detect(local, makeConfig());
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("added");
      expect(result.entries[0].filterCond).toBe("");
    });
  });

  describe("multiple changes", () => {
    it("should detect added, modified, and deleted simultaneously", () => {
      const local = makeConfig([
        makeRight({
          filterCond: "existing",
          entities: [
            {
              entity: { type: "USER", code: "user1" },
              viewable: true,
              editable: true,
              deletable: false,
              includeSubs: false,
            },
          ],
        }),
        makeRight({ filterCond: "new_rule" }),
      ]);
      const remote = makeConfig([
        makeRight({
          filterCond: "existing",
          entities: [
            {
              entity: { type: "USER", code: "user1" },
              viewable: true,
              editable: false,
              deletable: false,
              includeSubs: false,
            },
          ],
        }),
        makeRight({ filterCond: "old_rule" }),
      ]);
      const result = RecordPermissionDiffDetector.detect(local, remote);
      expect(result.summary.added).toBe(1);
      expect(result.summary.modified).toBe(1);
      expect(result.summary.deleted).toBe(1);
      expect(result.summary.total).toBe(3);
      expect(result.isEmpty).toBe(false);
    });
  });
});
