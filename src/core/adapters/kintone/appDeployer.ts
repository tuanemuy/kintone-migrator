import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import { isBusinessRuleError } from "@/core/domain/error";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";

type DeployStatus = "PROCESSING" | "SUCCESS" | "FAIL" | "CANCEL";

type KintoneAppDeployerConfig = {
  pollIntervalMs?: number;
  maxRetries?: number;
};

const DEFAULT_POLL_INTERVAL_MS = 1000;
const DEFAULT_MAX_RETRIES = 180;

export class KintoneAppDeployer implements AppDeployer {
  private readonly pollIntervalMs: number;
  private readonly maxRetries: number;

  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
    config?: KintoneAppDeployerConfig,
  ) {
    this.pollIntervalMs = config?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.maxRetries = config?.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  async deploy(): Promise<void> {
    try {
      await this.client.app.deployApp({
        apps: [{ app: this.appId }],
      });

      await this.waitForDeployment();
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to deploy app",
        error,
      );
    }
  }

  private async waitForDeployment(): Promise<void> {
    let lastPollError: unknown;
    let consecutivePollFailures = 0;
    const maxConsecutivePollFailures = 5;

    for (let i = 0; i < this.maxRetries; i++) {
      await this.sleep(this.pollIntervalMs);

      let apps: { status: string }[];
      try {
        const response = await this.client.app.getDeployStatus({
          apps: [this.appId],
        });
        apps = response.apps;
        consecutivePollFailures = 0;
      } catch (error) {
        // Rethrow known application/domain errors immediately
        if (isBusinessRuleError(error)) throw error;
        if (error instanceof SystemError) throw error;
        // Transient network errors during polling should retry, but give up
        // after too many consecutive failures to avoid masking permanent errors.
        lastPollError = error;
        consecutivePollFailures++;
        if (consecutivePollFailures >= maxConsecutivePollFailures) {
          throw new SystemError(
            SystemErrorCode.ExternalApiError,
            `Deploy status polling failed ${maxConsecutivePollFailures} consecutive times`,
            lastPollError,
          );
        }
        continue;
      }

      const status = apps[0]?.status as DeployStatus | undefined;

      switch (status) {
        case "SUCCESS":
          return;
        case "FAIL":
          throw new SystemError(
            SystemErrorCode.ExternalApiError,
            "App deployment failed",
          );
        case "CANCEL":
          throw new SystemError(
            SystemErrorCode.ExternalApiError,
            "App deployment was cancelled",
          );
        case "PROCESSING":
          continue;
        case undefined:
          throw new SystemError(
            SystemErrorCode.ExternalApiError,
            "Deploy status unavailable",
          );
        default:
          throw new SystemError(
            SystemErrorCode.ExternalApiError,
            `Unexpected deploy status: ${status satisfies never}`,
          );
      }
    }

    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      "App deployment timed out",
      lastPollError,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
