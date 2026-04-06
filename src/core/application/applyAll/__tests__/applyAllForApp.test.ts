import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApplyAllContainers } from "@/core/application/container/applyAll";
import {
  SystemError,
  SystemErrorCode,
  UnauthenticatedError,
  UnauthenticatedErrorCode,
} from "@/core/application/error";
import {
  type ApplyAllForAppInput,
  type ApplyDomain,
  applyAllForApp,
} from "../applyAllForApp";

// Mock all apply/migrate functions
vi.mock("@/core/application/formSchema/executeMigration");
vi.mock("@/core/application/formSchema/deployApp");
vi.mock("@/core/application/customization/applyCustomization");
vi.mock("@/core/application/view/applyView");
vi.mock("@/core/application/fieldPermission/applyFieldPermission");
vi.mock("@/core/application/appPermission/applyAppPermission");
vi.mock("@/core/application/recordPermission/applyRecordPermission");
vi.mock("@/core/application/generalSettings/applyGeneralSettings");
vi.mock("@/core/application/notification/applyNotification");
vi.mock("@/core/application/report/applyReport");
vi.mock("@/core/application/action/applyAction");
vi.mock("@/core/application/processManagement/applyProcessManagement");
vi.mock("@/core/application/adminNotes/applyAdminNotes");
vi.mock("@/core/application/plugin/applyPlugin");
vi.mock("@/core/application/seedData/upsertSeed");

import { applyAction } from "@/core/application/action/applyAction";
import { applyAdminNotes } from "@/core/application/adminNotes/applyAdminNotes";
import { applyAppPermission } from "@/core/application/appPermission/applyAppPermission";
import { applyCustomization } from "@/core/application/customization/applyCustomization";
import { applyFieldPermission } from "@/core/application/fieldPermission/applyFieldPermission";
import { deployApp } from "@/core/application/formSchema/deployApp";
import { executeMigration } from "@/core/application/formSchema/executeMigration";
import { applyGeneralSettings } from "@/core/application/generalSettings/applyGeneralSettings";
import { applyNotification } from "@/core/application/notification/applyNotification";
import { applyPlugin } from "@/core/application/plugin/applyPlugin";
import { applyProcessManagement } from "@/core/application/processManagement/applyProcessManagement";
import { applyRecordPermission } from "@/core/application/recordPermission/applyRecordPermission";
import { applyReport } from "@/core/application/report/applyReport";
import { upsertSeed } from "@/core/application/seedData/upsertSeed";
import { applyView } from "@/core/application/view/applyView";

const stubContainers = {} as ApplyAllContainers;

const baseArgs: ApplyAllForAppInput = {
  containers: stubContainers,
  customizeBasePath: "apps/test-app",
};

function setupAllMocksToSucceed(): void {
  vi.mocked(executeMigration).mockResolvedValue(undefined);
  vi.mocked(deployApp).mockResolvedValue(undefined);
  vi.mocked(applyCustomization).mockResolvedValue(undefined);
  vi.mocked(applyView).mockResolvedValue({
    skippedBuiltinViews: [],
  });
  vi.mocked(applyFieldPermission).mockResolvedValue(undefined);
  vi.mocked(applyAppPermission).mockResolvedValue(undefined);
  vi.mocked(applyRecordPermission).mockResolvedValue(undefined);
  vi.mocked(applyGeneralSettings).mockResolvedValue(undefined);
  vi.mocked(applyNotification).mockResolvedValue(undefined);
  vi.mocked(applyReport).mockResolvedValue(undefined);
  vi.mocked(applyAction).mockResolvedValue(undefined);
  vi.mocked(applyProcessManagement).mockResolvedValue({
    enableChanged: false,
    newEnable: true,
  });
  vi.mocked(applyAdminNotes).mockResolvedValue(undefined);
  vi.mocked(applyPlugin).mockResolvedValue(undefined);
  vi.mocked(upsertSeed).mockResolvedValue({
    added: 0,
    updated: 0,
    unchanged: 0,
    deleted: 0,
    total: 0,
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("applyAllForApp", () => {
  it("全5フェーズ・14ドメインが成功すること", async () => {
    setupAllMocksToSucceed();

    const output = await applyAllForApp(baseArgs);

    expect(output.phases).toHaveLength(5);
    expect(output.phases[0].phase).toBe("Schema");
    expect(output.phases[1].phase).toBe("Views & Customization");
    expect(output.phases[2].phase).toBe("Permissions");
    expect(output.phases[3].phase).toBe("Settings & Others");
    expect(output.phases[4].phase).toBe("Seed Data");

    const allResults = output.phases.flatMap((p) => p.results);
    expect(allResults).toHaveLength(14);
    for (const result of allResults) {
      expect(result.success).toBe(true);
    }

    // Verify domain ordering within phases
    const domains = allResults.map((r) => r.domain);
    expect(domains).toEqual([
      "schema",
      "customize",
      "view",
      "field-acl",
      "app-acl",
      "record-acl",
      "settings",
      "notification",
      "report",
      "action",
      "process",
      "admin-notes",
      "plugin",
      "seed",
    ]);
  });

  it("全成功時に deployed が true であること", async () => {
    setupAllMocksToSucceed();

    const output = await applyAllForApp(baseArgs);

    expect(output.deployed).toBe(true);
  });

  it("Phase 1 (Schema) で deploy が schema apply 直後に呼ばれること", async () => {
    setupAllMocksToSucceed();
    const callOrder: string[] = [];

    vi.mocked(executeMigration).mockImplementation(async () => {
      callOrder.push("executeMigration");
    });
    vi.mocked(deployApp).mockImplementation(async () => {
      callOrder.push("deployApp");
    });
    vi.mocked(applyCustomization).mockImplementation(async () => {
      callOrder.push("applyCustomization");
    });

    await applyAllForApp(baseArgs);

    expect(callOrder[0]).toBe("executeMigration");
    expect(callOrder[1]).toBe("deployApp");
    // customization comes after schema deploy
    expect(callOrder[2]).toBe("applyCustomization");
  });

  it("Phase 1 失敗で後続の全フェーズが中止されること", async () => {
    setupAllMocksToSucceed();
    vi.mocked(executeMigration).mockRejectedValue(
      new SystemError(
        SystemErrorCode.ExternalApiError,
        "Schema migration failed",
      ),
    );

    const output = await applyAllForApp(baseArgs);

    // Phase 1 fails
    expect(output.phases[0].results[0].success).toBe(false);

    // All subsequent phases should be skipped
    for (const phase of output.phases.slice(1)) {
      for (const result of phase.results) {
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain("Skipped due to fatal error");
        }
      }
    }

    // No deploy after Phase 2-4 since all were skipped
    expect(output.deployed).toBe(false);
  });

  it("Phase 1 deploy 失敗でも後続フェーズが中止されること", async () => {
    setupAllMocksToSucceed();
    // executeMigration succeeds but deploy fails
    vi.mocked(deployApp).mockRejectedValueOnce(
      new SystemError(SystemErrorCode.ExternalApiError, "Deploy failed"),
    );

    const output = await applyAllForApp(baseArgs);

    // Phase 1 schema should fail
    expect(output.phases[0].results[0].success).toBe(false);

    // All subsequent phases should be skipped
    for (const phase of output.phases.slice(1)) {
      for (const result of phase.results) {
        expect(result.success).toBe(false);
      }
    }
  });

  it("Phase 2-4 で非致命的エラーが発生しても他のドメインは継続すること", async () => {
    setupAllMocksToSucceed();
    vi.mocked(applyCustomization).mockRejectedValue(
      new SystemError(
        SystemErrorCode.ExternalApiError,
        "Customization API error",
      ),
    );

    const output = await applyAllForApp(baseArgs);

    // Phase 1 succeeds
    expect(output.phases[0].results[0].success).toBe(true);

    // Phase 2: customize fails, view succeeds
    const phase2 = output.phases[1];
    expect(phase2.results[0].domain).toBe("customize");
    expect(phase2.results[0].success).toBe(false);
    expect(phase2.results[1].domain).toBe("view");
    expect(phase2.results[1].success).toBe(true);

    // Phase 3-5 continue normally
    for (const phase of output.phases.slice(2)) {
      for (const result of phase.results) {
        expect(result.success).toBe(true);
      }
    }

    // Deploy still happens for successful domains
    expect(output.deployed).toBe(true);
  });

  it("Phase 2-4 で致命的エラー (UnauthenticatedError) が発生すると後続タスク・フェーズが中止されること", async () => {
    setupAllMocksToSucceed();
    vi.mocked(applyFieldPermission).mockRejectedValue(
      new UnauthenticatedError(
        UnauthenticatedErrorCode.InvalidCredentials,
        "Invalid credentials",
      ),
    );

    const output = await applyAllForApp(baseArgs);

    // Phase 1 succeeds
    expect(output.phases[0].results[0].success).toBe(true);

    // Phase 2 succeeds
    expect(output.phases[1].results.every((r) => r.success)).toBe(true);

    // Phase 3: field-acl fails fatally, app-acl and record-acl are skipped
    const phase3 = output.phases[2];
    expect(phase3.results[0].domain).toBe("field-acl");
    expect(phase3.results[0].success).toBe(false);
    expect(phase3.results[1].domain).toBe("app-acl");
    expect(phase3.results[1].success).toBe(false);
    if (!phase3.results[1].success) {
      expect(phase3.results[1].error.message).toContain("Skipped");
    }

    // Phase 4 and 5 are all skipped
    for (const phase of output.phases.slice(3)) {
      for (const result of phase.results) {
        expect(result.success).toBe(false);
      }
    }
  });

  it("Phase 2-4 が全てスキップされた場合は deploy されないこと", async () => {
    setupAllMocksToSucceed();
    // Phase 1 succeeds but Phase 2 first task hits fatal error
    vi.mocked(applyCustomization).mockRejectedValue(
      new UnauthenticatedError(
        UnauthenticatedErrorCode.InvalidCredentials,
        "Invalid credentials",
      ),
    );

    const output = await applyAllForApp(baseArgs);

    // customize failed fatally -> view is skipped
    // All Phase 3, 4, 5 are skipped
    // Phase 2 has customize (failed) and view (skipped) — no successes in Phase 2-4
    const phase2And3And4Successes = output.phases
      .slice(1, 4)
      .flatMap((p) => p.results)
      .filter((r) => r.success);
    expect(phase2And3And4Successes).toHaveLength(0);

    expect(output.deployed).toBe(false);
  });

  it("Phase 2-4 完了後に一括 deploy が実行されること", async () => {
    setupAllMocksToSucceed();
    const deployCallCount = { count: 0 };
    vi.mocked(deployApp).mockImplementation(async () => {
      deployCallCount.count++;
    });

    await applyAllForApp(baseArgs);

    // deployApp should be called twice:
    // 1. After schema migration (Phase 1)
    // 2. After Phase 2-4 complete (batch deploy)
    expect(deployCallCount.count).toBe(2);
  });

  it("Phase 2-4 一括 deploy が失敗した場合に deployed が false になること", async () => {
    setupAllMocksToSucceed();
    let deployCount = 0;
    vi.mocked(deployApp).mockImplementation(async () => {
      deployCount++;
      // First call (Phase 1 schema deploy) succeeds
      // Second call (Phase 2-4 batch deploy) fails
      if (deployCount === 2) {
        throw new SystemError(
          SystemErrorCode.ExternalApiError,
          "Deploy failed",
        );
      }
    });

    const output = await applyAllForApp(baseArgs);

    // Phase results should still show success for each domain
    const allResults = output.phases.flatMap((p) => p.results);
    for (const result of allResults) {
      expect(result.success).toBe(true);
    }

    // But deployed should be false
    expect(output.deployed).toBe(false);
  });

  it("フェーズ内のタスクが直列実行されること（実行順序の検証）", async () => {
    setupAllMocksToSucceed();
    const callOrder: ApplyDomain[] = [];

    vi.mocked(executeMigration).mockImplementation(async () => {
      callOrder.push("schema");
    });
    vi.mocked(applyCustomization).mockImplementation(async () => {
      callOrder.push("customize");
    });
    vi.mocked(applyView).mockImplementation(async () => {
      callOrder.push("view");
      return { skippedBuiltinViews: [] };
    });
    vi.mocked(applyFieldPermission).mockImplementation(async () => {
      callOrder.push("field-acl");
    });
    vi.mocked(applyAppPermission).mockImplementation(async () => {
      callOrder.push("app-acl");
    });
    vi.mocked(applyRecordPermission).mockImplementation(async () => {
      callOrder.push("record-acl");
    });
    vi.mocked(applyGeneralSettings).mockImplementation(async () => {
      callOrder.push("settings");
    });
    vi.mocked(applyNotification).mockImplementation(async () => {
      callOrder.push("notification");
    });
    vi.mocked(applyReport).mockImplementation(async () => {
      callOrder.push("report");
    });
    vi.mocked(applyAction).mockImplementation(async () => {
      callOrder.push("action");
    });
    vi.mocked(applyProcessManagement).mockImplementation(async () => {
      callOrder.push("process");
      return { enableChanged: false, newEnable: true };
    });
    vi.mocked(applyAdminNotes).mockImplementation(async () => {
      callOrder.push("admin-notes");
    });
    vi.mocked(applyPlugin).mockImplementation(async () => {
      callOrder.push("plugin");
    });
    vi.mocked(upsertSeed).mockImplementation(async () => {
      callOrder.push("seed");
      return { added: 0, updated: 0, unchanged: 0, deleted: 0, total: 0 };
    });

    await applyAllForApp(baseArgs);

    expect(callOrder).toEqual([
      "schema",
      "customize",
      "view",
      "field-acl",
      "app-acl",
      "record-acl",
      "settings",
      "notification",
      "report",
      "action",
      "process",
      "admin-notes",
      "plugin",
      "seed",
    ]);
  });

  it("seed (Phase 5) が deploy を必要としないこと", async () => {
    setupAllMocksToSucceed();
    // Make all Phase 2-4 domains fail with non-fatal errors
    vi.mocked(applyCustomization).mockRejectedValue(
      new SystemError(SystemErrorCode.ExternalApiError, "fail"),
    );
    vi.mocked(applyView).mockRejectedValue(
      new SystemError(SystemErrorCode.ExternalApiError, "fail"),
    );
    vi.mocked(applyFieldPermission).mockRejectedValue(
      new SystemError(SystemErrorCode.ExternalApiError, "fail"),
    );
    vi.mocked(applyAppPermission).mockRejectedValue(
      new SystemError(SystemErrorCode.ExternalApiError, "fail"),
    );
    vi.mocked(applyRecordPermission).mockRejectedValue(
      new SystemError(SystemErrorCode.ExternalApiError, "fail"),
    );
    vi.mocked(applyGeneralSettings).mockRejectedValue(
      new SystemError(SystemErrorCode.ExternalApiError, "fail"),
    );
    vi.mocked(applyNotification).mockRejectedValue(
      new SystemError(SystemErrorCode.ExternalApiError, "fail"),
    );
    vi.mocked(applyReport).mockRejectedValue(
      new SystemError(SystemErrorCode.ExternalApiError, "fail"),
    );
    vi.mocked(applyAction).mockRejectedValue(
      new SystemError(SystemErrorCode.ExternalApiError, "fail"),
    );
    vi.mocked(applyProcessManagement).mockRejectedValue(
      new SystemError(SystemErrorCode.ExternalApiError, "fail"),
    );
    vi.mocked(applyAdminNotes).mockRejectedValue(
      new SystemError(SystemErrorCode.ExternalApiError, "fail"),
    );
    vi.mocked(applyPlugin).mockRejectedValue(
      new SystemError(SystemErrorCode.ExternalApiError, "fail"),
    );

    const output = await applyAllForApp(baseArgs);

    // Seed still succeeds
    const seedResult = output.phases[4].results[0];
    expect(seedResult.domain).toBe("seed");
    expect(seedResult.success).toBe(true);

    // No deploy since Phase 2-4 have no successes
    expect(output.deployed).toBe(false);

    // deployApp should only be called once (Phase 1 schema)
    expect(vi.mocked(deployApp)).toHaveBeenCalledTimes(1);
  });
});
