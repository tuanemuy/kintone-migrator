import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isCliEnvVar } from "./cliEnv";

const srcDir = resolve(import.meta.dirname, "..");

function isTestSource(path: string): boolean {
  return path.includes("__tests__") || path.endsWith(".test.ts");
}

function envNamesReadBySource(): Set<string> {
  const names = new Set<string>();
  const files = readdirSync(srcDir, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".ts") && !isTestSource(path))
    .map((path) => readFileSync(join(srcDir, path), "utf8"));
  for (const source of files) {
    for (const match of source.matchAll(
      /process\.env(?:\.([A-Za-z_]\w*)|\[\s*["'`]([^"'`]+)["'`]\s*\])/g,
    )) {
      names.add(match[1] ?? match[2]);
    }
  }
  return names;
}

describe("isCliEnvVar", () => {
  it.each([
    "KINTONE_DOMAIN",
    "KINTONE_API_TOKEN",
    "KINTONE_USERNAME",
    "KINTONE_PASSWORD",
    "KINTONE_APP_ID",
    "KINTONE_GUEST_SPACE_ID",
    "SCHEMA_FILE_PATH",
    "SEED_FILE_PATH",
    "VERBOSE",
  ])("%s を CLI の環境変数と判定する", (name) => {
    expect(isCliEnvVar(name)).toBe(true);
  });

  it.each([
    "PATH",
    "HOME",
    "KINTONE",
    "MY_KINTONE_DOMAIN",
    "FILE_PATH",
    "SCHEMA_FILE_PATH_X",
    "VERBOSE_X",
    "verbose",
  ])("%s を CLI の環境変数と判定しない", (name) => {
    expect(isCliEnvVar(name)).toBe(false);
  });

  it("本体コードが process.env から読む名前をすべて CLI の環境変数と判定する", () => {
    const names = [...envNamesReadBySource()];

    expect(names).toEqual(
      expect.arrayContaining(["KINTONE_DOMAIN", "SCHEMA_FILE_PATH", "VERBOSE"]),
    );
    expect(names.filter((name) => !isCliEnvVar(name))).toEqual([]);
  });
});

describe("テストのセットアップ", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ホストから引き継いだ CLI の環境変数を取り除いている", () => {
    expect(Object.keys(process.env).filter(isCliEnvVar)).toEqual([]);
  });

  it("vi.unstubAllEnvs() の後にホストの値を復元しない", () => {
    vi.stubEnv("KINTONE_DOMAIN", "stubbed.cybozu.com");
    expect(process.env.KINTONE_DOMAIN).toBe("stubbed.cybozu.com");

    vi.unstubAllEnvs();

    expect(process.env.KINTONE_DOMAIN).toBeUndefined();
  });
});
