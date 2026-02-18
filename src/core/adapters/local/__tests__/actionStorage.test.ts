import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SystemError } from "@/core/application/error";
import { LocalFileActionStorage } from "../actionStorage";

describe("LocalFileActionStorage", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "action-storage-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("get", () => {
    it("ファイルが存在しない場合、exists: false を返す", async () => {
      const storage = new LocalFileActionStorage(
        join(tempDir, "nonexistent.yaml"),
      );
      const result = await storage.get();
      expect(result).toEqual({ exists: false });
    });

    it("ファイルが存在する場合、exists: true と内容を返す", async () => {
      const filePath = join(tempDir, "action.yaml");
      const content = "actions:\n  - name: test\n";
      await writeFile(filePath, content, "utf-8");

      const storage = new LocalFileActionStorage(filePath);
      const result = await storage.get();
      expect(result).toEqual({ content, exists: true });
    });

    it("ファイルが存在するが空の場合、exists: true と空文字列を返す", async () => {
      const filePath = join(tempDir, "empty.yaml");
      await writeFile(filePath, "", "utf-8");

      const storage = new LocalFileActionStorage(filePath);
      const result = await storage.get();
      expect(result).toEqual({ content: "", exists: true });
    });

    it("ENOENT以外のエラーの場合、SystemErrorをスローする", async () => {
      await mkdir(join(tempDir, "dir"));
      const storage = new LocalFileActionStorage(join(tempDir, "dir"));

      await expect(storage.get()).rejects.toThrow(SystemError);
    });
  });

  describe("update", () => {
    it("親ディレクトリが存在しなくてもファイルを作成する", async () => {
      const filePath = join(tempDir, "nested", "deep", "action.yaml");
      const content = "actions:\n  - name: test\n";
      const storage = new LocalFileActionStorage(filePath);

      await storage.update(content);

      const written = await readFile(filePath, "utf-8");
      expect(written).toBe(content);
    });

    it("書き込み先がディレクトリの場合、SystemError をスローする", async () => {
      await mkdir(join(tempDir, "blocked"));
      const storage = new LocalFileActionStorage(join(tempDir, "blocked"));

      await expect(storage.update("content")).rejects.toThrow(SystemError);
    });

    it("既存ファイルを上書きする", async () => {
      const filePath = join(tempDir, "action.yaml");
      await writeFile(filePath, "old content", "utf-8");

      const storage = new LocalFileActionStorage(filePath);
      const newContent = "actions:\n  - name: updated\n";
      await storage.update(newContent);

      const written = await readFile(filePath, "utf-8");
      expect(written).toBe(newContent);
    });
  });
});
