import { afterEach, describe, expect, it, vi } from "vitest";
import { isCliEnvVar, removeCliEnvVars } from "./cliEnv";

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
