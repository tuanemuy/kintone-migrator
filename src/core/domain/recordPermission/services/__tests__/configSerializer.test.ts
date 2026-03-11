import { describe, expect, it } from "vitest";
import type { RecordPermissionConfig } from "../../entity";
import { RecordPermissionConfigParser } from "../configParser";
import { RecordPermissionConfigSerializer } from "../configSerializer";

describe("RecordPermissionConfigSerializer", () => {
  describe("serialize", () => {
    it("should serialize config with multiple rights", () => {
      const config: RecordPermissionConfig = {
        rights: [
          {
            filterCond: 'status = "open"',
            entities: [
              {
                entity: { type: "USER", code: "user1" },
                viewable: true,
                editable: true,
                deletable: false,
                includeSubs: false,
              },
              {
                entity: { type: "GROUP", code: "group1" },
                viewable: true,
                editable: false,
                deletable: false,
                includeSubs: true,
              },
            ],
          },
          {
            filterCond: "",
            entities: [
              {
                entity: { type: "ORGANIZATION", code: "org1" },
                viewable: true,
                editable: true,
                deletable: true,
                includeSubs: false,
              },
            ],
          },
        ],
      };

      const result = RecordPermissionConfigSerializer.serialize(config);
      const rights = result.rights as Record<string, unknown>[];

      expect(rights).toHaveLength(2);

      const entities0 = rights[0].entities as Record<string, unknown>[];
      expect((entities0[0].entity as Record<string, unknown>).code).toBe(
        "user1",
      );
      expect((entities0[1].entity as Record<string, unknown>).code).toBe(
        "group1",
      );
      expect(entities0[1].includeSubs).toBe(true);
      expect(entities0[0].viewable).toBe(true);
      expect(entities0[0].editable).toBe(true);
      expect(entities0[0].deletable).toBe(false);

      const entities1 = rights[1].entities as Record<string, unknown>[];
      expect((entities1[0].entity as Record<string, unknown>).code).toBe(
        "org1",
      );
    });

    it("should serialize config with empty rights", () => {
      const config: RecordPermissionConfig = {
        rights: [],
      };

      const result = RecordPermissionConfigSerializer.serialize(config);

      expect(result.rights).toEqual([]);
    });

    it("should roundtrip parse and serialize", () => {
      const input = {
        rights: [
          {
            filterCond: 'status = "open"',
            entities: [
              {
                entity: { type: "USER", code: "user1" },
                viewable: true,
                editable: true,
                deletable: false,
                includeSubs: false,
              },
              {
                entity: { type: "GROUP", code: "group1" },
                viewable: true,
                editable: false,
                deletable: false,
                includeSubs: true,
              },
            ],
          },
          {
            filterCond: "",
            entities: [
              {
                entity: { type: "ORGANIZATION", code: "org1" },
                viewable: true,
                editable: true,
                deletable: true,
                includeSubs: false,
              },
              {
                entity: { type: "FIELD_ENTITY", code: "creator_field" },
                viewable: true,
                editable: false,
                deletable: false,
                includeSubs: false,
              },
            ],
          },
        ],
      };
      const parsed = RecordPermissionConfigParser.parse(input);
      const serialized = RecordPermissionConfigSerializer.serialize(parsed);
      const reparsed = RecordPermissionConfigParser.parse(serialized);

      expect(reparsed).toEqual(parsed);
    });
  });
});
