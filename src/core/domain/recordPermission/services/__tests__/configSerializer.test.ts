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

      const yaml = RecordPermissionConfigSerializer.serialize(config);

      expect(yaml).toContain("user1");
      expect(yaml).toContain("group1");
      expect(yaml).toContain("org1");
      expect(yaml).toContain("includeSubs: true");
      expect(yaml).toContain("viewable: true");
      expect(yaml).toContain("editable: true");
      expect(yaml).toContain("deletable: false");
    });

    it("should serialize config with empty rights", () => {
      const config: RecordPermissionConfig = {
        rights: [],
      };

      const yaml = RecordPermissionConfigSerializer.serialize(config);

      expect(yaml).toContain("rights: []");
    });

    it("should roundtrip parse and serialize", () => {
      const originalYaml = `
rights:
  - filterCond: status = "open"
    entities:
      - entity:
          type: USER
          code: user1
        viewable: true
        editable: true
        deletable: false
        includeSubs: false
      - entity:
          type: GROUP
          code: group1
        viewable: true
        editable: false
        deletable: false
        includeSubs: true
  - filterCond: ""
    entities:
      - entity:
          type: ORGANIZATION
          code: org1
        viewable: true
        editable: true
        deletable: true
        includeSubs: false
      - entity:
          type: FIELD_ENTITY
          code: creator_field
        viewable: true
        editable: false
        deletable: false
        includeSubs: false
`;
      const parsed = RecordPermissionConfigParser.parse(originalYaml);
      const serialized = RecordPermissionConfigSerializer.serialize(parsed);
      const reparsed = RecordPermissionConfigParser.parse(serialized);

      expect(reparsed).toEqual(parsed);
    });
  });
});
