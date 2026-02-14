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

      const yaml = FieldPermissionConfigSerializer.serialize(config);

      expect(yaml).toContain("field_code_1");
      expect(yaml).toContain("WRITE");
      expect(yaml).toContain("user1");
      expect(yaml).toContain("group1");
      expect(yaml).toContain("includeSubs: true");
      expect(yaml).toContain("field_code_2");
      expect(yaml).toContain("NONE");
      expect(yaml).toContain("org1");
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

      const yaml = FieldPermissionConfigSerializer.serialize(config);

      expect(yaml).toContain("includeSubs: false");
    });

    it("should serialize config with empty rights", () => {
      const config: FieldPermissionConfig = {
        rights: [],
      };

      const yaml = FieldPermissionConfigSerializer.serialize(config);

      expect(yaml).toContain("rights: []");
    });

    it("should roundtrip parse and serialize", () => {
      const originalYaml = `
rights:
  - code: field_code_1
    entities:
      - accessibility: WRITE
        entity:
          type: USER
          code: user1
      - accessibility: READ
        entity:
          type: GROUP
          code: group1
        includeSubs: true
  - code: field_code_2
    entities:
      - accessibility: NONE
        entity:
          type: ORGANIZATION
          code: org1
        includeSubs: true
      - accessibility: READ
        entity:
          type: FIELD_ENTITY
          code: creator_field
`;
      const parsed = FieldPermissionConfigParser.parse(originalYaml);
      const serialized = FieldPermissionConfigSerializer.serialize(parsed);
      const reparsed = FieldPermissionConfigParser.parse(serialized);

      expect(reparsed).toEqual(parsed);
    });
  });
});
