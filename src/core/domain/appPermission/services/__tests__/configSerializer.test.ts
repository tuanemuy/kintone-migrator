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

      const result = AppPermissionConfigSerializer.serialize(config);
      const rights = result.rights as Record<string, unknown>[];

      expect(rights).toHaveLength(2);

      const first = rights[0];
      const firstEntity = first.entity as Record<string, unknown>;
      expect(firstEntity.code).toBe("Administrators");
      expect(firstEntity.type).toBe("GROUP");
      expect(first.appEditable).toBe(true);
      expect(first.recordViewable).toBe(true);

      const second = rights[1];
      const secondEntity = second.entity as Record<string, unknown>;
      expect(secondEntity.code).toBe("user1");
      expect(secondEntity.type).toBe("USER");
      expect(second.appEditable).toBe(false);
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

      const result = AppPermissionConfigSerializer.serialize(config);
      const rights = result.rights as Record<string, unknown>[];
      const entity = rights[0].entity as Record<string, unknown>;

      expect(entity.type).toBe("CREATOR");
      expect(rights[0].recordViewable).toBe(true);
      expect(rights[0].appEditable).toBe(false);
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

      const result = AppPermissionConfigSerializer.serialize(config);
      const rights = result.rights as Record<string, unknown>[];

      expect(rights[0].includeSubs).toBe(true);
      const entity = rights[0].entity as Record<string, unknown>;
      expect(entity.type).toBe("ORGANIZATION");
      expect(entity.code).toBe("dev-team");
    });

    it("should serialize config with empty rights", () => {
      const config: AppPermissionConfig = {
        rights: [],
      };

      const result = AppPermissionConfigSerializer.serialize(config);

      expect(result.rights).toEqual([]);
    });

    it("should roundtrip parse and serialize", () => {
      const input = {
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
            entity: { type: "CREATOR" },
            includeSubs: false,
            appEditable: false,
            recordViewable: true,
            recordAddable: false,
            recordEditable: false,
            recordDeletable: false,
            recordImportable: false,
            recordExportable: false,
          },
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
      const parsed = AppPermissionConfigParser.parse(input);
      const serialized = AppPermissionConfigSerializer.serialize(parsed);
      const reparsed = AppPermissionConfigParser.parse(serialized);

      expect(reparsed).toEqual(parsed);
    });
  });
});
