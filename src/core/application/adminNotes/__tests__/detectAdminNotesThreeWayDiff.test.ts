import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestAdminNotesContainer } from "@/core/application/__tests__/helpers";
import type { TestAdminNotesContainer } from "@/core/application/__tests__/helpers/adminNotes";
import type { AdminNotesConfig } from "@/core/domain/adminNotes/entity";
import { AdminNotesStateSerializer } from "@/core/domain/adminNotes/services/adminNotesStateSerializer";
import { detectAdminNotesThreeWayDiff } from "../detectAdminNotesThreeWayDiff";

const baseConfig: AdminNotesConfig = {
  content: "base",
  includeInTemplateAndDuplicates: false,
};

function notesYaml(content: string): string {
  return `content: "${content}"\nincludeInTemplateAndDuplicates: false\n`;
}

function setState(
  container: TestAdminNotesContainer,
  config: AdminNotesConfig,
  revision: string,
): void {
  container.adminNotesStateStorage.setContent(
    configCodec.stringify(AdminNotesStateSerializer.serialize({ config })),
  );
  container.appRevisionStorage.setContent(configCodec.stringify({ revision }));
}

describe("detectAdminNotesThreeWayDiff", () => {
  const getContainer = setupTestAdminNotesContainer();

  it("falls back to 2-way when no state exists", async () => {
    const container = getContainer();
    container.adminNotesStorage.setContent(notesYaml("local"));
    container.adminNotesConfigurator.setConfig(baseConfig, "1");

    const result = await detectAdminNotesThreeWayDiff({ container });

    expect(result.mode).toBe("two-way");
  });

  it("classifies a local-only change", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.adminNotesStorage.setContent(notesYaml("local"));
    container.adminNotesConfigurator.setConfig(baseConfig, "1");

    const result = await detectAdminNotesThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.localChanges.map((e) => e.key)).toEqual(["admin-notes"]);
      expect(result.conflicts).toHaveLength(0);
    }
  });

  it("classifies remote drift", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.adminNotesStorage.setContent(notesYaml("base"));
    container.adminNotesConfigurator.setConfig(
      { content: "remote", includeInTemplateAndDuplicates: false },
      "2",
    );

    const result = await detectAdminNotesThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.remoteDrift.map((e) => e.key)).toEqual(["admin-notes"]);
    }
  });

  it("classifies a conflict", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.adminNotesStorage.setContent(notesYaml("local"));
    container.adminNotesConfigurator.setConfig(
      { content: "remote", includeInTemplateAndDuplicates: false },
      "2",
    );

    const result = await detectAdminNotesThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.conflicts.map((e) => e.key)).toEqual(["admin-notes"]);
    }
  });
});
