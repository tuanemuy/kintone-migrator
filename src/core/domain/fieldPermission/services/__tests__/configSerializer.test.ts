import { describe, expect, it } from "vitest";
import type { FieldPermissionConfig } from "../../entity";
import { FieldPermissionConfigParser } from "../configParser";
import { FieldPermissionConfigSerializer } from "../configSerializer";

describe("FieldPermissionConfigSerializer", () => {
  describe("serialize", () => {
    it("should serialize config with multiple rights", () => {
      const config: FieldPermissionConfig = {
        rights: [
          {
            code: "field_code_1",
            entities: [
              {
                accessibility: "WRITE",
                entity: { type: "USER", code: "user1" },
              },
              {
                accessibility: "READ",
                entity: { type: "GROUP", code: "group1" },
                includeSubs: true,
              },
            ],
          },
          {
            code: "field_code_2",
            entities: [
              {
                accessibility: "NONE",
                entity: { type: "ORGANIZATION", code: "org1" },
                includeSubs: true,
              },
            ],
          },
        ],
      };

      const result = FieldPermissionConfigSerializer.serialize(config);
      const rights = result.rights as Record<string, unknown>[];

      expect(rights).toHaveLength(2);
      expect(rights[0].code).toBe("field_code_1");

      const entities0 = rights[0].entities as Record<string, unknown>[];
      expect(entities0[0].accessibility).toBe("WRITE");
      expect((entities0[0].entity as Record<string, unknown>).code).toBe(
        "user1",
      );
      expect((entities0[1].entity as Record<string, unknown>).code).toBe(
        "group1",
      );
      expect(entities0[1].includeSubs).toBe(true);

      expect(rights[1].code).toBe("field_code_2");
      const entities1 = rights[1].entities as Record<string, unknown>[];
      expect(entities1[0].accessibility).toBe("NONE");
      expect((entities1[0].entity as Record<string, unknown>).code).toBe(
        "org1",
      );
    });

    it("should serialize config with includeSubs false", () => {
      const config: FieldPermissionConfig = {
        rights: [
          {
            code: "field_code_1",
            entities: [
              {
                accessibility: "READ",
                entity: { type: "GROUP", code: "group1" },
                includeSubs: false,
              },
            ],
          },
        ],
      };

      const result = FieldPermissionConfigSerializer.serialize(config);
      const rights = result.rights as Record<string, unknown>[];
      const entities = rights[0].entities as Record<string, unknown>[];

      expect(entities[0].includeSubs).toBe(false);
    });

    it("should serialize config with empty rights", () => {
      const config: FieldPermissionConfig = {
        rights: [],
      };

      const result = FieldPermissionConfigSerializer.serialize(config);

      expect(result.rights).toEqual([]);
    });

    it("should roundtrip parse and serialize", () => {
      const input = {
        rights: [
          {
            code: "field_code_1",
            entities: [
              {
                accessibility: "WRITE",
                entity: { type: "USER", code: "user1" },
              },
              {
                accessibility: "READ",
                entity: { type: "GROUP", code: "group1" },
                includeSubs: true,
              },
            ],
          },
          {
            code: "field_code_2",
            entities: [
              {
                accessibility: "NONE",
                entity: { type: "ORGANIZATION", code: "org1" },
                includeSubs: true,
              },
              {
                accessibility: "READ",
                entity: { type: "FIELD_ENTITY", code: "creator_field" },
              },
            ],
          },
        ],
      };
      const parsed = FieldPermissionConfigParser.parse(input);
      const serialized = FieldPermissionConfigSerializer.serialize(parsed);
      const reparsed = FieldPermissionConfigParser.parse(serialized);

      expect(reparsed).toEqual(parsed);
    });
  });
});
