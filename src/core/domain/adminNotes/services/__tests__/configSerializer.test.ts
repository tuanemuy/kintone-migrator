import { describe, expect, it } from "vitest";
import type { AdminNotesConfig } from "../../entity";
import { AdminNotesConfigParser } from "../configParser";
import { AdminNotesConfigSerializer } from "../configSerializer";

describe("AdminNotesConfigSerializer", () => {
  describe("serialize", () => {
    it("should serialize config with HTML content", () => {
      const config: AdminNotesConfig = {
        content: "<p>This is a test memo.</p>",
        includeInTemplateAndDuplicates: true,
      };

      const yaml = AdminNotesConfigSerializer.serialize(config);

      expect(yaml).toContain("<p>This is a test memo.</p>");
      expect(yaml).toContain("includeInTemplateAndDuplicates: true");
    });

    it("should serialize config with includeInTemplateAndDuplicates false", () => {
      const config: AdminNotesConfig = {
        content: "simple memo",
        includeInTemplateAndDuplicates: false,
      };

      const yaml = AdminNotesConfigSerializer.serialize(config);

      expect(yaml).toContain("includeInTemplateAndDuplicates: false");
    });

    it("should serialize config with empty content", () => {
      const config: AdminNotesConfig = {
        content: "",
        includeInTemplateAndDuplicates: true,
      };

      const yaml = AdminNotesConfigSerializer.serialize(config);

      expect(yaml).toContain("content:");
      expect(yaml).toContain("includeInTemplateAndDuplicates: true");
    });

    it("should serialize content with YAML-special characters (colon, hash, ampersand)", () => {
      const config: AdminNotesConfig = {
        content:
          "<p>Note: this app is managed by CI/CD.</p>\n<p># Do not edit & modify * settings manually.</p>",
        includeInTemplateAndDuplicates: false,
      };

      const yaml = AdminNotesConfigSerializer.serialize(config);
      const reparsed = AdminNotesConfigParser.parse(yaml);

      expect(reparsed.content).toBe(config.content);
    });

    it("should roundtrip content with leading special characters", () => {
      const config: AdminNotesConfig = {
        content: "# This starts with a hash\n- list item\n> blockquote",
        includeInTemplateAndDuplicates: true,
      };

      const yaml = AdminNotesConfigSerializer.serialize(config);
      const reparsed = AdminNotesConfigParser.parse(yaml);

      expect(reparsed.content).toBe(config.content);
    });

    it("should roundtrip content with complex HTML", () => {
      const config: AdminNotesConfig = {
        content:
          '<div class="note"><h1>Title</h1><p>Key: value</p><a href="https://example.com?a=1&b=2">link</a></div>',
        includeInTemplateAndDuplicates: true,
      };

      const yaml = AdminNotesConfigSerializer.serialize(config);
      const reparsed = AdminNotesConfigParser.parse(yaml);

      expect(reparsed.content).toBe(config.content);
    });

    it("should roundtrip parse and serialize", () => {
      const originalYaml = `
content: |
  <p>This app is managed by kintone-migrator.</p>
  <p>Do not change settings manually.</p>
includeInTemplateAndDuplicates: true
`;
      const parsed = AdminNotesConfigParser.parse(originalYaml);
      const serialized = AdminNotesConfigSerializer.serialize(parsed);
      const reparsed = AdminNotesConfigParser.parse(serialized);

      expect(reparsed).toEqual(parsed);
    });
  });
});
