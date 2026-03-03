import { describe, expect, it } from "vitest";
import { ValidationError } from "@/core/application/error";
import { assertSafePath } from "../assertSafePath";

describe("assertSafePath", () => {
  const baseDir = "/home/user/project";

  describe("正常パス", () => {
    it("baseDir 直下のファイルを許可する", () => {
      expect(() => assertSafePath("file.json", baseDir)).not.toThrow();
    });

    it("baseDir 配下のサブディレクトリファイルを許可する", () => {
      expect(() => assertSafePath("sub/dir/file.json", baseDir)).not.toThrow();
    });

    it("baseDir 自体を許可する", () => {
      expect(() => assertSafePath(".", baseDir)).not.toThrow();
    });

    it("絶対パスが baseDir 配下であれば許可する", () => {
      expect(() =>
        assertSafePath("/home/user/project/file.json", baseDir),
      ).not.toThrow();
    });
  });

  describe("パストラバーサル拒否", () => {
    it(".. による親ディレクトリエスケープを拒否する", () => {
      expect(() => assertSafePath("../etc/passwd", baseDir)).toThrow(
        ValidationError,
      );
    });

    it("深いネストからの .. エスケープを拒否する", () => {
      expect(() => assertSafePath("sub/../../other/file", baseDir)).toThrow(
        ValidationError,
      );
    });

    it("兄弟ディレクトリへのアクセスを拒否する", () => {
      expect(() =>
        assertSafePath("/home/user/other-project/file", baseDir),
      ).toThrow(ValidationError);
    });

    it("エラーメッセージにパス情報が含まれる", () => {
      expect(() => assertSafePath("../../etc/passwd", baseDir)).toThrow(
        /Path traversal detected/,
      );
    });
  });
});
