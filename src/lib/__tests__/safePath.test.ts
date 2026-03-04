import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isSafePath } from "../safePath";

describe("isSafePath", () => {
  const baseDir = "/home/user/project";

  describe("正常パス", () => {
    it("baseDir 直下のファイルを許可する", () => {
      expect(isSafePath("file.json", baseDir)).toBe(true);
    });

    it("baseDir 配下のサブディレクトリファイルを許可する", () => {
      expect(isSafePath("sub/dir/file.json", baseDir)).toBe(true);
    });

    it("baseDir 自体を許可する", () => {
      expect(isSafePath(".", baseDir)).toBe(true);
    });

    it("絶対パスが baseDir 配下であれば許可する", () => {
      expect(isSafePath("/home/user/project/file.json", baseDir)).toBe(true);
    });
  });

  describe("パストラバーサル拒否", () => {
    it(".. による親ディレクトリエスケープを拒否する", () => {
      expect(isSafePath("../etc/passwd", baseDir)).toBe(false);
    });

    it("深いネストからの .. エスケープを拒否する", () => {
      expect(isSafePath("sub/../../other/file", baseDir)).toBe(false);
    });

    it("兄弟ディレクトリへのアクセスを拒否する", () => {
      expect(isSafePath("/home/user/other-project/file", baseDir)).toBe(false);
    });

    it("baseDir のプレフィックスが一致する別ディレクトリを拒否する", () => {
      expect(isSafePath("/home/user/project-evil/file", baseDir)).toBe(false);
    });

    it("null byte を含むパスを拒否する", () => {
      expect(isSafePath("file\x00/../etc/passwd", baseDir)).toBe(false);
    });

    it("空文字列パスを baseDir 自体として扱う", () => {
      expect(isSafePath("", baseDir)).toBe(true);
    });
  });

  describe("実ファイルシステム統合テスト", () => {
    const testDir = join(tmpdir(), `safePath-test-${process.pid}`);
    const innerDir = join(testDir, "inner");
    const outsideDir = join(tmpdir(), `safePath-outside-${process.pid}`);

    beforeAll(() => {
      mkdirSync(innerDir, { recursive: true });
      mkdirSync(outsideDir, { recursive: true });
      writeFileSync(join(innerDir, "ok.txt"), "ok");
      writeFileSync(join(outsideDir, "secret.txt"), "secret");
      symlinkSync(outsideDir, join(testDir, "escape-link"));
    });

    afterAll(() => {
      rmSync(testDir, { recursive: true, force: true });
      rmSync(outsideDir, { recursive: true, force: true });
    });

    it("実ディレクトリ内のファイルを許可する", () => {
      expect(isSafePath(join(innerDir, "ok.txt"), testDir)).toBe(true);
    });

    it("シンボリックリンク経由のディレクトリ脱出を拒否する", () => {
      expect(
        isSafePath(join(testDir, "escape-link", "secret.txt"), testDir),
      ).toBe(false);
    });
  });
});
