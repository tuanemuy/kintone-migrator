import { basename, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { deriveFilePrefix } from "../capture";

describe("deriveFilePrefix", () => {
  it("customize.yaml はカレントディレクトリ名を返す", () => {
    // resolve("customize.yaml") → /cwd/customize.yaml → parentDir = cwd's basename
    const expected = basename(resolve("."));
    expect(deriveFilePrefix("customize.yaml")).toBe(expected);
  });

  it("ディレクトリ内の customize.yaml は親ディレクトリ名を返す", () => {
    expect(deriveFilePrefix("myapp/customize.yaml")).toBe("myapp");
  });

  it("customize以外のファイル名はそのファイル名を返す", () => {
    expect(deriveFilePrefix("custom-settings.yaml")).toBe("custom-settings");
  });

  it("ディレクトリ内の customize以外のファイル名はファイル名を返す", () => {
    expect(deriveFilePrefix("some-dir/my-config.yaml")).toBe("my-config");
  });

  it("深いパスの customize.yaml は直近の親ディレクトリ名を返す", () => {
    expect(deriveFilePrefix("path/to/customer/customize.yaml")).toBe(
      "customer",
    );
  });

  it("絶対パスの customize.yaml は親ディレクトリ名を返す", () => {
    expect(deriveFilePrefix("/project/apps/myapp/customize.yaml")).toBe(
      "myapp",
    );
  });

  it(".yml 拡張子のファイルも正しくファイル名を返す", () => {
    expect(deriveFilePrefix("my-config.yml")).toBe("my-config");
  });

  it("ディレクトリ内の .yml ファイルも正しくファイル名を返す", () => {
    expect(deriveFilePrefix("some-dir/my-config.yml")).toBe("my-config");
  });
});
