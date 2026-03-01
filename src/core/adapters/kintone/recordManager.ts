import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import { isBusinessRuleError } from "@/core/domain/error";
import type { SeedRecordWithId } from "@/core/domain/seedData/entity";
import type { RecordManager } from "@/core/domain/seedData/ports/recordManager";
import type { SeedRecord } from "@/core/domain/seedData/valueObject";
import { fromKintoneRecord, toKintoneRecord } from "./recordConverter";

function extractId(record: Record<string, unknown>): string {
  const $id = record.$id as { value: string } | undefined;
  if (!$id || typeof $id.value !== "string") {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      "Record missing $id field from kintone API response",
    );
  }
  return $id.value;
}

export class KintoneRecordManager implements RecordManager {
  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
  ) {}

  async getAllRecords(
    condition?: string,
  ): Promise<readonly SeedRecordWithId[]> {
    try {
      const records = await this.client.record.getAllRecords({
        app: this.appId,
        ...(condition !== undefined ? { condition } : {}),
      });
      return records.map((r) => {
        const raw = r as unknown as Record<string, { value: unknown }> & {
          $id: { value: string };
        };
        const id = extractId(r as Record<string, unknown>);
        const record = fromKintoneRecord(raw);
        return { id, record };
      });
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

  async addRecords(records: readonly SeedRecord[]): Promise<void> {
    if (records.length === 0) return;
    try {
      await this.client.record.addAllRecords({
        app: this.appId,
        records: records.map(toKintoneRecord),
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

  async updateRecords(records: readonly SeedRecordWithId[]): Promise<void> {
    if (records.length === 0) return;
    try {
      await this.client.record.updateAllRecords({
        app: this.appId,
        records: records.map((r) => ({
          id: Number(r.id),
          record: toKintoneRecord(r.record),
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

  async deleteAllRecords(): Promise<{ deletedCount: number }> {
    try {
      const records = await this.client.record.getAllRecords({
        app: this.appId,
        fields: ["$id"],
      });
      if (records.length === 0) return { deletedCount: 0 };

      const ids = records.map((r) => ({
        id: Number(extractId(r as Record<string, unknown>)),
      }));
      await this.client.record.deleteAllRecords({
        app: this.appId,
        records: ids,
      });
      return { deletedCount: records.length };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to delete all records",
        error,
      );
    }
  }
}
