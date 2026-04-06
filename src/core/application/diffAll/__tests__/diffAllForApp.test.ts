import { describe, expect, it, vi } from "vitest";
import type { DiffAllContainers } from "@/core/application/container/diffAll";
import {
  SystemError,
  SystemErrorCode,
  UnauthenticatedError,
  UnauthenticatedErrorCode,
} from "@/core/application/error";
import type { DiffResult, DiffSummary } from "@/core/domain/diff";
import { DIFF_BATCH_SIZE, diffAllForApp } from "../diffAllForApp";

// Mock all 13 diff detection functions so we test only the batch orchestration
vi.mock("@/core/application/formSchema/detectDiff");
vi.mock("@/core/application/customization/detectCustomizationDiff");
vi.mock("@/core/application/view/detectViewDiff");
vi.mock("@/core/application/generalSettings/detectGeneralSettingsDiff");
vi.mock("@/core/application/notification/detectNotificationDiff");
vi.mock("@/core/application/report/detectReportDiff");
vi.mock("@/core/application/action/detectActionDiff");
vi.mock("@/core/application/processManagement/detectProcessManagementDiff");
vi.mock("@/core/application/fieldPermission/detectFieldPermissionDiff");
vi.mock("@/core/application/appPermission/detectAppPermissionDiff");
vi.mock("@/core/application/recordPermission/detectRecordPermissionDiff");
vi.mock("@/core/application/adminNotes/detectAdminNotesDiff");
vi.mock("@/core/application/plugin/detectPluginDiff");

import { detectActionDiff } from "@/core/application/action/detectActionDiff";
import { detectAdminNotesDiff } from "@/core/application/adminNotes/detectAdminNotesDiff";
import { detectAppPermissionDiff } from "@/core/application/appPermission/detectAppPermissionDiff";
import { detectCustomizationDiff } from "@/core/application/customization/detectCustomizationDiff";
import { detectFieldPermissionDiff } from "@/core/application/fieldPermission/detectFieldPermissionDiff";
import { detectDiff } from "@/core/application/formSchema/detectDiff";
import { detectGeneralSettingsDiff } from "@/core/application/generalSettings/detectGeneralSettingsDiff";
import { detectNotificationDiff } from "@/core/application/notification/detectNotificationDiff";
import { detectPluginDiff } from "@/core/application/plugin/detectPluginDiff";
import { detectProcessManagementDiff } from "@/core/application/processManagement/detectProcessManagementDiff";
import { detectRecordPermissionDiff } from "@/core/application/recordPermission/detectRecordPermissionDiff";
import { detectReportDiff } from "@/core/application/report/detectReportDiff";
import { detectViewDiff } from "@/core/application/view/detectViewDiff";

const emptySummary: DiffSummary = {
  added: 0,
  modified: 0,
  deleted: 0,
  total: 0,
};

// Use `never` so the empty entries array is assignable to any specific DiffResult<E>
function makeEmptyDiffResult(): DiffResult<never> {
  return { entries: [], summary: emptySummary, isEmpty: true, warnings: [] };
}

function makeEmptyDetectDiffOutput() {
  return {
    entries: [],
    schemaFields: [],
    summary: emptySummary,
    isEmpty: true,
    hasLayoutChanges: false,
  };
}

// Minimal stub containers — the actual methods won't be called because
// the detection functions are mocked.
const stubContainers = {} as DiffAllContainers;

function setupAllMocksToSucceed(): void {
  vi.mocked(detectDiff).mockResolvedValue(makeEmptyDetectDiffOutput());
  vi.mocked(detectCustomizationDiff).mockResolvedValue(makeEmptyDiffResult());
  vi.mocked(detectViewDiff).mockResolvedValue(makeEmptyDiffResult());
  vi.mocked(detectGeneralSettingsDiff).mockResolvedValue(makeEmptyDiffResult());
  vi.mocked(detectNotificationDiff).mockResolvedValue(makeEmptyDiffResult());
  vi.mocked(detectReportDiff).mockResolvedValue(makeEmptyDiffResult());
  vi.mocked(detectActionDiff).mockResolvedValue(makeEmptyDiffResult());
  vi.mocked(detectProcessManagementDiff).mockResolvedValue(
    makeEmptyDiffResult(),
  );
  vi.mocked(detectFieldPermissionDiff).mockResolvedValue(makeEmptyDiffResult());
  vi.mocked(detectAppPermissionDiff).mockResolvedValue(makeEmptyDiffResult());
  vi.mocked(detectRecordPermissionDiff).mockResolvedValue(
    makeEmptyDiffResult(),
  );
  vi.mocked(detectAdminNotesDiff).mockResolvedValue(makeEmptyDiffResult());
  vi.mocked(detectPluginDiff).mockResolvedValue(makeEmptyDiffResult());
}

describe("diffAllForApp", () => {
  const baseArgs = {
    containers: stubContainers,
    customizeBasePath: "apps/test-app",
  };

  it("全13ドメインの結果が返ること", async () => {
    setupAllMocksToSucceed();

    const results = await diffAllForApp(baseArgs);

    expect(results).toHaveLength(13);
    for (const result of results) {
      expect(result.success).toBe(true);
    }

    const domains = results.map((r) => r.domain);
    expect(domains).toEqual([
      "schema",
      "customize",
      "view",
      "settings",
      "notification",
      "report",
      "action",
      "process",
      "field-acl",
      "app-acl",
      "record-acl",
      "admin-notes",
      "plugin",
    ]);
  });

  it("変更なしドメインの isEmpty が true になること", async () => {
    setupAllMocksToSucceed();

    const results = await diffAllForApp(baseArgs);

    for (const result of results) {
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result.isEmpty).toBe(true);
      }
    }
  });

  it("変更ありドメインの isEmpty が false で結果に反映されること", async () => {
    setupAllMocksToSucceed();

    const nonEmptyResult: DiffResult<never> = {
      entries: [],
      summary: { added: 2, modified: 1, deleted: 0, total: 3 },
      isEmpty: false,
      warnings: [],
    };
    vi.mocked(detectViewDiff).mockResolvedValue(nonEmptyResult);

    const results = await diffAllForApp(baseArgs);

    const viewResult = results.find((r) => r.domain === "view");
    expect(viewResult?.success).toBe(true);
    if (viewResult?.success) {
      expect(viewResult.result.isEmpty).toBe(false);
      expect(viewResult.result.summary.added).toBe(2);
    }

    // Other domains should still be empty
    const otherResults = results.filter(
      (r) => r.domain !== "view" && r.success,
    );
    for (const result of otherResults) {
      if (result.success) {
        expect(result.result.isEmpty).toBe(true);
      }
    }
  });

  it("非致命的エラーでは後続ドメインが継続すること", async () => {
    setupAllMocksToSucceed();

    // Make schema fail with a non-fatal error (ExternalApiError)
    vi.mocked(detectDiff).mockRejectedValue(
      new SystemError(SystemErrorCode.ExternalApiError, "API error"),
    );

    const results = await diffAllForApp(baseArgs);

    expect(results).toHaveLength(13);

    const schemaResult = results.find((r) => r.domain === "schema");
    expect(schemaResult?.success).toBe(false);

    // Other domains should still succeed
    const successCount = results.filter((r) => r.success).length;
    expect(successCount).toBe(12);
  });

  it("致命的エラー (UnauthenticatedError) で後続バッチがskipされること", async () => {
    setupAllMocksToSucceed();

    // Make schema (first in first batch) fail with UnauthenticatedError
    vi.mocked(detectDiff).mockRejectedValue(
      new UnauthenticatedError(
        UnauthenticatedErrorCode.InvalidCredentials,
        "Invalid credentials",
      ),
    );

    const results = await diffAllForApp(baseArgs);

    expect(results).toHaveLength(13);

    // Schema fails fatally
    expect(results[0].domain).toBe("schema");
    expect(results[0].success).toBe(false);

    // All domains in subsequent batches are skipped due to fatal error
    for (const result of results.slice(DIFF_BATCH_SIZE)) {
      expect(result.success).toBe(false);
    }
  });

  it("致命的エラー (NetworkError) で後続バッチがskipされること", async () => {
    setupAllMocksToSucceed();

    // Make customize (second in first batch) fail with NetworkError
    vi.mocked(detectCustomizationDiff).mockRejectedValue(
      new SystemError(SystemErrorCode.NetworkError, "Network error"),
    );

    const results = await diffAllForApp(baseArgs);

    expect(results).toHaveLength(13);

    // Schema succeeds (in same batch as the failing customize)
    expect(results[0].domain).toBe("schema");
    expect(results[0].success).toBe(true);

    // Customize fails with NetworkError (fatal)
    expect(results[1].domain).toBe("customize");
    expect(results[1].success).toBe(false);

    // All domains in subsequent batches are skipped due to fatal error
    for (const result of results.slice(DIFF_BATCH_SIZE)) {
      expect(result.success).toBe(false);
    }
  });
});
