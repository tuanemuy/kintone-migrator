import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import { isBusinessRuleError } from "@/core/domain/error";
import type {
  KintoneRecordForParameter,
  KintoneRecordForResponse,
  RecordManager,
} from "@/core/domain/seedData/ports/recordManager";

// kintone SDK returns records as Record<string, { value: unknown }> with $id field.
// Our domain type KintoneRecordForResponse is structurally compatible but TypeScript
// cannot verify this across library boundaries. These helpers bridge the gap.

function toKintoneRecordForResponse(
  record: Record<string, unknown>,
): KintoneRecordForResponse {
  const $id = record.$id as { value: string } | undefined;
  if (!$id || typeof $id.value !== "string") {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      "Record missing $id field from kintone API response",
    );
  }
  return record as KintoneRecordForResponse;
}

function toSdkRecord(
  record: KintoneRecordForParameter,
): Record<string, { value: unknown }> {
  return record as Record<string, { value: unknown }>;
}

export class KintoneRecordManager implements RecordManager {
  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
  ) {}

  async getAllRecords(
    condition?: string,
  ): Promise<readonly KintoneRecordForResponse[]> {
    try {
      const records = await this.client.record.getAllRecords({
        app: this.appId,
        ...(condition !== undefined ? { condition } : {}),
      });
      return records.map((r) =>
        toKintoneRecordForResponse(r as Record<string, unknown>),
      );
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to get records",
        error,
      );
    }
  }

  async addRecords(
    records: readonly KintoneRecordForParameter[],
  ): Promise<void> {
    if (records.length === 0) return;
    try {
      await this.client.record.addAllRecords({
        app: this.appId,
        records: records.map(toSdkRecord),
      });
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to add records",
        error,
      );
    }
  }

  async updateRecords(
    records: readonly {
      id: string;
      record: KintoneRecordForParameter;
    }[],
  ): Promise<void> {
    if (records.length === 0) return;
    try {
      await this.client.record.updateAllRecords({
        app: this.appId,
        records: records.map((r) => ({
          id: Number(r.id),
          record: toSdkRecord(r.record),
        })),
      });
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to update records",
        error,
      );
    }
  }
}
