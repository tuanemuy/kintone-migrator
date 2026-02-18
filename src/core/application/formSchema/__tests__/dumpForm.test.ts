import { beforeEach, describe, expect, it } from "vitest";
import type { DumpContainer } from "@/core/application/container/dump";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { DumpStorage } from "@/core/domain/formSchema/ports/dumpStorage";
import type {
  FormDumpReader,
  RawFormDump,
} from "@/core/domain/formSchema/ports/formDumpReader";
import { dumpForm } from "../dumpForm";

class InMemoryFormDumpReader implements FormDumpReader {
  private data: RawFormDump = { fields: {}, layout: {} };
  private shouldFail = false;

  async getRawFormData(): Promise<RawFormDump> {
    if (this.shouldFail) {
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "getRawFormData failed (test)",
      );
    }
    return this.data;
  }

  setData(data: RawFormDump): void {
    this.data = data;
  }

  setFailOn(): void {
    this.shouldFail = true;
  }
}

class InMemoryDumpStorage implements DumpStorage {
  savedFields: string | null = null;
  savedLayout: string | null = null;
  private failOn: Set<string> = new Set();

  async saveFields(content: string): Promise<void> {
    if (this.failOn.has("saveFields")) {
      throw new SystemError(
        SystemErrorCode.StorageError,
        "saveFields failed (test)",
      );
    }
    this.savedFields = content;
  }

  async saveLayout(content: string): Promise<void> {
    if (this.failOn.has("saveLayout")) {
      throw new SystemError(
        SystemErrorCode.StorageError,
        "saveLayout failed (test)",
      );
    }
    this.savedLayout = content;
  }

  setFailOn(methodName: string): void {
    this.failOn.add(methodName);
  }
}

function createTestDumpContainer(): {
  container: DumpContainer;
  formDumpReader: InMemoryFormDumpReader;
  dumpStorage: InMemoryDumpStorage;
} {
  const formDumpReader = new InMemoryFormDumpReader();
  const dumpStorage = new InMemoryDumpStorage();
  return {
    container: { formDumpReader, dumpStorage },
    formDumpReader,
    dumpStorage,
  };
}

describe("dumpForm", () => {
  let formDumpReader: InMemoryFormDumpReader;
  let dumpStorage: InMemoryDumpStorage;
  let container: DumpContainer;

  beforeEach(() => {
    const ctx = createTestDumpContainer();
    container = ctx.container;
    formDumpReader = ctx.formDumpReader;
    dumpStorage = ctx.dumpStorage;
  });

  it("フォームフィールドとレイアウトをJSON文字列としてストレージに保存する", async () => {
    const rawData: RawFormDump = {
      fields: { properties: { name: { type: "SINGLE_LINE_TEXT" } } },
      layout: { layout: [{ type: "ROW" }] },
    };
    formDumpReader.setData(rawData);

    await dumpForm({ container });

    expect(dumpStorage.savedFields).toBe(
      JSON.stringify(rawData.fields, null, 2),
    );
    expect(dumpStorage.savedLayout).toBe(
      JSON.stringify(rawData.layout, null, 2),
    );
  });

  it("空のフォームデータでも正常に保存される", async () => {
    formDumpReader.setData({ fields: {}, layout: {} });

    await dumpForm({ container });

    expect(dumpStorage.savedFields).toBe(JSON.stringify({}, null, 2));
    expect(dumpStorage.savedLayout).toBe(JSON.stringify({}, null, 2));
  });

  it("formDumpReader のエラーが伝播する", async () => {
    formDumpReader.setFailOn();

    await expect(dumpForm({ container })).rejects.toThrow(SystemError);
  });

  it("dumpStorage.saveFields のエラーが伝播する", async () => {
    formDumpReader.setData({ fields: {}, layout: {} });
    dumpStorage.setFailOn("saveFields");

    await expect(dumpForm({ container })).rejects.toThrow(SystemError);
  });

  it("dumpStorage.saveLayout のエラーが伝播する", async () => {
    formDumpReader.setData({ fields: {}, layout: {} });
    dumpStorage.setFailOn("saveLayout");

    await expect(dumpForm({ container })).rejects.toThrow(SystemError);
  });
});
