import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isCliEnvVar, removeCliEnvVars } from "./cliEnv";

const srcDir = resolve(import.meta.dirname, "..");

const PROCESS_ENV_ACCESS =
  /process\.env(?:\.([A-Za-z_]\w*)|\[\s*["'`]([^"'`]+)["'`]\s*\])?/g;
const ENV_IMPORT =
  /import\s*\{[^}]*\benv\b[^}]*\}\s*from\s*["'](?:node:)?process["']/g;

type EnvAccess = {
  names: Set<string>;
  // Accesses whose variable name cannot be read statically.
  unnamed: string[];
};

function isTestSource(path: string): boolean {
  return path.includes("__tests__") || path.endsWith(".test.ts");
}

function isCommentLine(source: string, index: number): boolean {
  const lineStart = source.lastIndexOf("\n", index) + 1;
  const line = source.slice(lineStart, index).trimStart();
  return line.startsWith("*") || line.startsWith("//") || line.startsWith("/*");
}

function collectEnvAccess(): EnvAccess {
  const access: EnvAccess = { names: new Set(), unnamed: [] };
  const paths = readdirSync(srcDir, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".ts") && !isTestSource(path))
    .sort();
  for (const path of paths) {
    const source = readFileSync(join(srcDir, path), "utf8");
    for (const match of source.matchAll(PROCESS_ENV_ACCESS)) {
      if (isCommentLine(source, match.index)) continue;
      const name = match[1] ?? match[2];
      if (name === undefined) {
        access.unnamed.push(`${path}: ${match[0]}`);
      } else {
        access.names.add(name);
      }
    }
    for (const match of source.matchAll(ENV_IMPORT)) {
      access.unnamed.push(`${path}: ${match[0]}`);
    }
  }
  return access;
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

  it("本体コードは process.env を変数名の分かる形でだけ読み、その名前はすべて CLI の環境変数と判定する", () => {
    const { names, unnamed } = collectEnvAccess();

    expect(unnamed).toEqual([]);
    expect([...names]).toEqual(
      expect.arrayContaining(["KINTONE_DOMAIN", "SCHEMA_FILE_PATH", "VERBOSE"]),
    );
    expect([...names].filter((name) => !isCliEnvVar(name))).toEqual([]);
  });
});

describe("removeCliEnvVars", () => {
  it("CLI の環境変数だけを取り除き、それ以外を値ごと残す", () => {
    const env: NodeJS.ProcessEnv = {
      KINTONE_DOMAIN: "host.cybozu.com",
      KINTONE_PASSWORD: "",
      SCHEMA_FILE_PATH: "host-schema.yaml",
      VERBOSE: "1",
      PATH: "/usr/bin",
      HOME: "/home/user",
      VERBOSE_X: "x",
    };

    removeCliEnvVars(env);

    expect(env).toStrictEqual({
      PATH: "/usr/bin",
      HOME: "/home/user",
      VERBOSE_X: "x",
    });
  });

  it("CLI の環境変数が無い場合は何も変えない", () => {
    const env: NodeJS.ProcessEnv = { PATH: "/usr/bin" };

    removeCliEnvVars(env);

    expect(env).toStrictEqual({ PATH: "/usr/bin" });
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
