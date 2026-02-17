import { describe, expect, it } from "vitest";
import type { AppPermissionConfig } from "../../entity";
import { AppPermissionConfigParser } from "../configParser";
import { AppPermissionConfigSerializer } from "../configSerializer";

describe("AppPermissionConfigSerializer", () => {
  describe("serialize", () => {
    it("should serialize config with multiple rights", () => {
      const config: AppPermissionConfig = {
        rights: [
          {
            entity: { type: "GROUP", code: "Administrators" },
            includeSubs: false,
            appEditable: true,
            recordViewable: true,
            recordAddable: true,
            recordEditable: true,
            recordDeletable: true,
            recordImportable: true,
            recordExportable: true,
          },
          {
            entity: { type: "USER", code: "user1" },
            includeSubs: false,
            appEditable: false,
            recordViewable: true,
            recordAddable: true,
            recordEditable: false,
            recordDeletable: false,
            recordImportable: false,
            recordExportable: false,
          },
        ],
      };

      const yaml = AppPermissionConfigSerializer.serialize(config);

      expect(yaml).toContain("Administrators");
      expect(yaml).toContain("GROUP");
      expect(yaml).toContain("user1");
      expect(yaml).toContain("USER");
      expect(yaml).toContain("appEditable: true");
      expect(yaml).toContain("appEditable: false");
      expect(yaml).toContain("recordViewable: true");
    });

    it("should serialize config with CREATOR entity type", () => {
      const config: AppPermissionConfig = {
        rights: [
          {
            entity: { type: "CREATOR", code: "" },
            includeSubs: false,
            appEditable: false,
            recordViewable: true,
            recordAddable: false,
            recordEditable: false,
            recordDeletable: false,
            recordImportable: false,
            recordExportable: false,
          },
        ],
      };

      const yaml = AppPermissionConfigSerializer.serialize(config);

      expect(yaml).toContain("CREATOR");
      expect(yaml).toContain("recordViewable: true");
      expect(yaml).toContain("appEditable: false");
    });

    it("should serialize config with includeSubs true", () => {
      const config: AppPermissionConfig = {
        rights: [
          {
            entity: { type: "ORGANIZATION", code: "dev-team" },
            includeSubs: true,
            appEditable: false,
            recordViewable: true,
            recordAddable: true,
            recordEditable: true,
            recordDeletable: false,
            recordImportable: false,
            recordExportable: false,
          },
        ],
      };

      const yaml = AppPermissionConfigSerializer.serialize(config);

      expect(yaml).toContain("includeSubs: true");
      expect(yaml).toContain("ORGANIZATION");
      expect(yaml).toContain("dev-team");
    });

    it("should serialize config with empty rights", () => {
      const config: AppPermissionConfig = {
        rights: [],
      };

      const yaml = AppPermissionConfigSerializer.serialize(config);

      expect(yaml).toContain("rights: []");
    });

    it("should roundtrip parse and serialize", () => {
      const originalYaml = `
rights:
  - entity:
      type: GROUP
      code: Administrators
    includeSubs: false
    appEditable: true
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: true
    recordImportable: true
    recordExportable: true
  - entity:
      type: CREATOR
    includeSubs: false
    appEditable: false
    recordViewable: true
    recordAddable: false
    recordEditable: false
    recordDeletable: false
    recordImportable: false
    recordExportable: false
  - entity:
      type: ORGANIZATION
      code: dev-team
    includeSubs: true
    appEditable: false
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: false
    recordImportable: false
    recordExportable: false
`;
      const parsed = AppPermissionConfigParser.parse(originalYaml);
      const serialized = AppPermissionConfigSerializer.serialize(parsed);
      const reparsed = AppPermissionConfigParser.parse(serialized);

      expect(reparsed).toEqual(parsed);
    });
  });
});
