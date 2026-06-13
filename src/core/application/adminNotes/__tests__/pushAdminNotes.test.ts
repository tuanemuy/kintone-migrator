import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestAdminNotesContainer } from "@/core/application/__tests__/helpers";
import type { TestAdminNotesContainer } from "@/core/application/__tests__/helpers/adminNotes";
import {
  ConflictError,
  ConflictErrorCode,
  isValidationError,
} from "@/core/application/error";
import type { AdminNotesConfig } from "@/core/domain/adminNotes/entity";
import { AdminNotesStateSerializer } from "@/core/domain/adminNotes/services/adminNotesStateSerializer";
import { pushAdminNotes } from "../pushAdminNotes";

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

describe("pushAdminNotes", () => {
  const getContainer = setupTestAdminNotesContainer();

  it("throws ValidationError when the local config file is missing", async () => {
    const container = getContainer();
    container.adminNotesConfigurator.setConfig(baseConfig, "1");

    await expect(pushAdminNotes({ container, input: {} })).rejects.toSatisfy(
      isValidationError,
    );
  });

  it("applies the local config and sends the observed revision as expected", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.adminNotesStorage.setContent(notesYaml("local"));
    container.adminNotesConfigurator.setConfig(baseConfig, "1");

    const result = await pushAdminNotes({ container, input: {} });

    expect(result.mode).toBe("push");
    expect(container.adminNotesConfigurator.lastUpdateParams?.revision).toBe(
      "1",
    );
    expect(container.appRevisionStorage.callLog).toContain("update");
  });

  it("rejects with a ConfigDrift ConflictError when the remote drifted", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.adminNotesStorage.setContent(notesYaml("local"));
    container.adminNotesConfigurator.setConfig(
      { content: "remote", includeInTemplateAndDuplicates: false },
      "2",
    );

    await expect(pushAdminNotes({ container, input: {} })).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ConflictError && e.code === ConflictErrorCode.ConfigDrift,
    );
    expect(container.adminNotesConfigurator.callLog).not.toContain(
      "updateAdminNotes",
    );
  });

  it("force skips the drift check and sends no expected revision", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.adminNotesStorage.setContent(notesYaml("local"));
    container.adminNotesConfigurator.setConfig(
      { content: "remote", includeInTemplateAndDuplicates: false },
      "2",
    );

    const result = await pushAdminNotes({ container, input: { force: true } });

    expect(result.mode).toBe("push");
    expect(
      container.adminNotesConfigurator.lastUpdateParams?.revision,
    ).toBeUndefined();
  });

  it("first run (no state) applies without a revision guard and initializes state", async () => {
    const container = getContainer();
    container.adminNotesStorage.setContent(notesYaml("local"));
    container.adminNotesConfigurator.setConfig(baseConfig, "5");

    const result = await pushAdminNotes({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(
      container.adminNotesConfigurator.lastUpdateParams?.revision,
    ).toBeUndefined();
    expect(container.adminNotesStateStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });
});
