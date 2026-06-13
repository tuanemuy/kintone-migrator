import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestAdminNotesContainer } from "@/core/application/__tests__/helpers";
import type { TestAdminNotesContainer } from "@/core/application/__tests__/helpers/adminNotes";
import type { AdminNotesConfig } from "@/core/domain/adminNotes/entity";
import { AdminNotesStateSerializer } from "@/core/domain/adminNotes/services/adminNotesStateSerializer";
import { applyPulledAdminNotesMerge, pullAdminNotes } from "../pullAdminNotes";

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

describe("pullAdminNotes", () => {
  const getContainer = setupTestAdminNotesContainer();

  it("first run (no state) overwrites local from remote and initializes state", async () => {
    const container = getContainer();
    container.adminNotesConfigurator.setConfig(
      { content: "remote", includeInTemplateAndDuplicates: false },
      "7",
    );

    const result = await pullAdminNotes({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(container.adminNotesStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });

  it("force overwrites local from remote (capture-equivalent)", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.adminNotesStorage.setContent(notesYaml("local"));
    container.adminNotesConfigurator.setConfig(
      { content: "remote", includeInTemplateAndDuplicates: false },
      "2",
    );

    const result = await pullAdminNotes({ container, input: { force: true } });

    expect(result.mode).toBe("force");
  });

  it("returns a conflict merge for resolution without writing local/state", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.adminNotesStorage.setContent(notesYaml("local"));
    container.adminNotesConfigurator.setConfig(
      { content: "remote", includeInTemplateAndDuplicates: false },
      "2",
    );

    const result = await pullAdminNotes({ container, input: {} });

    expect(result.mode).toBe("merged");
    if (result.mode === "merged") {
      expect(result.merge.hasConflict).toBe(true);
    }
    expect(container.adminNotesStorage.callLog).not.toContain("update");
    expect(container.adminNotesStateStorage.callLog).not.toContain("update");
  });

  it("applyPulledAdminNotesMerge writes the merged config and advances state", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.adminNotesStorage.setContent(notesYaml("local"));
    const remoteConfig: AdminNotesConfig = {
      content: "remote",
      includeInTemplateAndDuplicates: false,
    };
    container.adminNotesConfigurator.setConfig(remoteConfig, "2");

    const pull = await pullAdminNotes({ container, input: {} });
    if (pull.mode !== "merged") throw new Error("expected merged");

    await applyPulledAdminNotesMerge({
      container,
      input: {
        merge: pull.merge,
        resolution: "local",
        remoteConfig: pull.remoteConfig,
        remoteRevision: pull.remoteRevision,
      },
    });

    expect(container.adminNotesStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });
});
