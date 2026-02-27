import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SystemError } from "@/core/application/error";
import { createLocalFileCustomizationStorage } from "../customizationStorage";

describe("createLocalFileCustomizationStorage", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "customization-storage-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("get", () => {
    it("ファイルが存在しない場合、exists: false を返す", async () => {
      const storage = createLocalFileCustomizationStorage(
        join(tempDir, "nonexistent.yaml"),
      );
      const result = await storage.get();
      expect(result).toEqual({ exists: false });
    });

    it("ファイルが存在する場合、exists: true と内容を返す", async () => {
      const filePath = join(tempDir, "customization.yaml");
      const content = "desktop:\n  js:\n    - file.js\n";
      await writeFile(filePath, content, "utf-8");

      const storage = createLocalFileCustomizationStorage(filePath);
      const result = await storage.get();
      expect(result).toEqual({ content, exists: true });
    });

    it("ファイルが存在するが空の場合、exists: true と空文字列を返す", async () => {
      const filePath = join(tempDir, "empty.yaml");
      await writeFile(filePath, "", "utf-8");

      const storage = createLocalFileCustomizationStorage(filePath);
      const result = await storage.get();
      expect(result).toEqual({ content: "", exists: true });
    });

    it("ENOENT以外のエラーの場合、SystemErrorをスローする", async () => {
      await mkdir(join(tempDir, "dir"));
      const storage = createLocalFileCustomizationStorage(join(tempDir, "dir"));

      await expect(storage.get()).rejects.toThrow(SystemError);
    });
  });
});
