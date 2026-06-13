import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestGeneralSettingsContainer } from "@/core/application/__tests__/helpers";
import type { TestGeneralSettingsContainer } from "@/core/application/__tests__/helpers/generalSettings";
import {
  ConflictError,
  ConflictErrorCode,
  isValidationError,
} from "@/core/application/error";
import type { GeneralSettingsConfig } from "@/core/domain/generalSettings/entity";
import { GeneralSettingsStateSerializer } from "@/core/domain/generalSettings/services/generalSettingsStateSerializer";
import { pushGeneralSettings } from "../pushGeneralSettings";

function setState(
  container: TestGeneralSettingsContainer,
  config: GeneralSettingsConfig,
  revision: string,
): void {
  container.generalSettingsStateStorage.setContent(
    configCodec.stringify(GeneralSettingsStateSerializer.serialize({ config })),
  );
  container.appRevisionStorage.setContent(configCodec.stringify({ revision }));
}

const baseConfig: GeneralSettingsConfig = { name: "base" };

describe("pushGeneralSettings", () => {
  const getContainer = setupTestGeneralSettingsContainer();

  it("throws ValidationError when the local config file is missing", async () => {
    const container = getContainer();
    container.generalSettingsConfigurator.setConfig(baseConfig, "1");

    await expect(
      pushGeneralSettings({ container, input: {} }),
    ).rejects.toSatisfy(isValidationError);
  });

  it("applies the local config and sends the observed revision as expected", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.generalSettingsStorage.setContent("name: local\n");
    container.generalSettingsConfigurator.setConfig(baseConfig, "1");

    const result = await pushGeneralSettings({ container, input: {} });

    expect(result.mode).toBe("push");
    expect(
      container.generalSettingsConfigurator.lastUpdateParams?.revision,
    ).toBe("1");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });

  it("rejects with a ConfigDrift ConflictError when the remote drifted", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.generalSettingsStorage.setContent("name: local\n");
    container.generalSettingsConfigurator.setConfig({ name: "remote" }, "2");

    await expect(
      pushGeneralSettings({ container, input: {} }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ConflictError && e.code === ConflictErrorCode.ConfigDrift,
    );
    expect(container.generalSettingsConfigurator.callLog).not.toContain(
      "updateGeneralSettings",
    );
  });

  it("force skips the drift check and sends no expected revision", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.generalSettingsStorage.setContent("name: local\n");
    container.generalSettingsConfigurator.setConfig({ name: "remote" }, "2");

    const result = await pushGeneralSettings({
      container,
      input: { force: true },
    });

    expect(result.mode).toBe("push");
    expect(
      container.generalSettingsConfigurator.lastUpdateParams?.revision,
    ).toBeUndefined();
  });

  it("first run (no state) applies without a revision guard and initializes state", async () => {
    const container = getContainer();
    container.generalSettingsStorage.setContent("name: local\n");
    container.generalSettingsConfigurator.setConfig(baseConfig, "5");

    const result = await pushGeneralSettings({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(
      container.generalSettingsConfigurator.lastUpdateParams?.revision,
    ).toBeUndefined();
    expect(container.generalSettingsStateStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });
});
