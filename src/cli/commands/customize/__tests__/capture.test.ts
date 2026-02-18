import { describe, expect, it } from "vitest";
import { deriveFilePrefix } from "../capture";

describe("deriveFilePrefix", () => {
  it("customize.yaml は空文字を返す", () => {
    expect(deriveFilePrefix("customize.yaml")).toBe("");
  });

  it("ディレクトリ内の customize.yaml は空文字を返す", () => {
    expect(deriveFilePrefix("myapp/customize.yaml")).toBe("");
  });

  it("深いパスの customize.yaml は空文字を返す", () => {
    expect(deriveFilePrefix("path/to/customer/customize.yaml")).toBe("");
  });

  it("絶対パスの customize.yaml は空文字を返す", () => {
    expect(deriveFilePrefix("/project/apps/myapp/customize.yaml")).toBe("");
  });

  it("customize以外のファイル名はそのファイル名を返す", () => {
    expect(deriveFilePrefix("custom-settings.yaml")).toBe("custom-settings");
  });

  it("ディレクトリ内の customize以外のファイル名はファイル名を返す", () => {
    expect(deriveFilePrefix("some-dir/my-config.yaml")).toBe("my-config");
  });

  it("マルチアプリ形式のパスはアプリ名を返す", () => {
    expect(deriveFilePrefix("customize/customer.yaml")).toBe("customer");
  });

  it(".yml 拡張子のファイルも正しくファイル名を返す", () => {
    expect(deriveFilePrefix("my-config.yml")).toBe("my-config");
  });

  it("ディレクトリ内の .yml ファイルも正しくファイル名を返す", () => {
    expect(deriveFilePrefix("some-dir/my-config.yml")).toBe("my-config");
  });
});
