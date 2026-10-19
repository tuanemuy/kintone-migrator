import { join, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { isCliEnvVar } from "./cliEnv";
import { collectEnvAccess } from "./envAccess";

const rootDir = resolve(import.meta.dirname, "../..");

const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2024,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  noEmit: true,
  types: ["node"],
};

function collectFromSource(source: string) {
  const fileName = join(rootDir, "src", "__virtual__", "snippet.ts");
  const host = ts.createCompilerHost(compilerOptions);
  const { getSourceFile, fileExists, readFile } = host;
  host.getSourceFile = (name, languageVersion, ...rest) =>
    name === fileName
      ? ts.createSourceFile(name, source, languageVersion, true)
      : getSourceFile(name, languageVersion, ...rest);
  host.fileExists = (name) => name === fileName || fileExists(name);
  host.readFile = (name) => (name === fileName ? source : readFile(name));
  const program = ts.createProgram([fileName], compilerOptions, host);
  const { names, unnamed } = collectEnvAccess(program, [fileName]);
  return { names: [...names], unnamedCount: unnamed.length };
}

function isTestSource(path: string): boolean {
  return path.includes("/__tests__/") || path.endsWith(".test.ts");
}

describe("collectEnvAccess", () => {
  it.each([
    ["process.env.NAME", "export const x = process.env.FOO;"],
    ['process.env["NAME"]', 'export const x = process.env["FOO"];'],
    ['process["env"].NAME', 'export const x = process["env"].FOO;'],
    ["改行をはさんだ参照", "export const x = process\n  .env\n  .FOO;"],
    ["process の別名", "const p = process;\nexport const x = p.env.FOO;"],
    [
      "process からの分割代入",
      "const { env } = process;\nexport const x = env.FOO;",
    ],
    ["process.env の別名", "const e = process.env;\nexport const x = e.FOO;"],
    [
      "改名つきの分割代入",
      "const { env: e } = process;\nexport const x = e.FOO;",
    ],
    [
      "node:process からの named import",
      'import { env } from "node:process";\nexport const x = env.FOO;',
    ],
    [
      "node:process からの default と named の import",
      'import proc, { env } from "node:process";\nexport const x = env.FOO + String(proc.pid);',
    ],
    [
      "node:process からの namespace import",
      'import * as p from "node:process";\nexport const x = p.env.FOO;',
    ],
    [
      "node:process からの default import",
      'import proc from "node:process";\nexport const x = proc.env.FOO;',
    ],
    ["コメントを前に置いた行", "/* note */ export const x = process.env.FOO;"],
  ])("%s を変数名つきの読み取りとして集める", (_, source) => {
    expect(collectFromSource(source)).toEqual({
      names: ["FOO"],
      unnamedCount: 0,
    });
  });

  it.each([
    ["optional chaining", "export const x = process.env?.FOO;"],
    ["分割代入", "export const { FOO } = process.env;"],
    [
      "コメントを前に置いた分割代入",
      "/* note */ export const { FOO } = process.env;",
    ],
    ["動的キー", "export const f = (n: string) => process.env[n];"],
    [
      "要素アクセスの optional chaining",
      'export const x = process.env?.["FOO"];',
    ],
    [
      "型注釈で広げた process.env の別名",
      "const e: Record<string, string | undefined> = process.env;\nexport const x = e.FOO;",
    ],
    [
      "別名を経由して型注釈で広げた代入",
      "const e = process.env;\nconst e2: Record<string, string | undefined> = e;\nexport const x = e2.FOO;",
    ],
    [
      "型注釈で広げた process の別名",
      "const p: { env: Record<string, string | undefined> } = process;\nexport const x = p.env.FOO;",
    ],
    [
      "型注釈で広げた process からの分割代入",
      "const { env }: { env: Record<string, string | undefined> } = process;\nexport const x = env.FOO;",
    ],
    [
      "型注釈で広げた namespace import の別名",
      'import * as p from "node:process";\nconst q: { env: Record<string, string | undefined> } = p;\nexport const x = q.env.FOO;',
    ],
    [
      "型アサーション",
      "export const x = (process.env as Record<string, string | undefined>).FOO;",
    ],
    ["process の残余の分割代入", "export const { ...rest } = process;"],
    [
      "process の計算されたプロパティ名の分割代入",
      'const k = "env" as const;\nconst { [k]: e } = process;\nexport const x = e.FOO;',
    ],
    [
      "process の動的キー",
      'export const f = (k: "env" | "argv") => process[k];',
    ],
    [
      "any にした globalThis からの取り出し",
      "export const x = (globalThis as any).process.env.FOO;",
    ],
    [
      'any の値からの ["env"]',
      'declare const p: any;\nexport const x = p["env"].FOO;',
    ],
    [
      "require からの取り出し",
      'export const x = require("node:process").env.FOO;',
    ],
    [
      "process の受け渡し",
      "declare function f(p: unknown): void;\nf(process);",
    ],
    [
      "関数への受け渡し",
      "declare function f(e: unknown): void;\nf(process.env);",
    ],
    ["スプレッド", "export const copy = { ...process.env };"],
    [
      "process.env の別名の受け渡し",
      "const e = process.env;\nexport const copy = { ...e };",
    ],
    [
      "import した env の受け渡し",
      'import { env } from "node:process";\nexport const copy = { env };',
    ],
  ])("%s を変数名の分からない読み取りとして集める", (_, source) => {
    expect(collectFromSource(source).unnamedCount).toBe(1);
  });

  it("コメントや文字列の中の process.env は集めない", () => {
    expect(
      collectFromSource(
        '// process.env.FOO\n/** process.env.BAR */\nexport const s = "process.env.BAZ";',
      ),
    ).toEqual({ names: [], unnamedCount: 0 });
  });

  it("型の位置にある ProcessEnv は集めない", () => {
    expect(
      collectFromSource(
        "export type E = NodeJS.ProcessEnv;\nexport type V = typeof process.env;",
      ),
    ).toEqual({ names: [], unnamedCount: 0 });
  });

  it("process の env 以外のプロパティは集めない", () => {
    expect(
      collectFromSource(
        'export const cwd = process.cwd();\nexport const argv = process["argv"];\nconst { exit } = process;\nexport { exit };',
      ),
    ).toEqual({ names: [], unnamedCount: 0 });
  });

  it("any の値の env 以外のプロパティは集めない", () => {
    expect(
      collectFromSource(
        'declare const p: any;\nexport const x = p.environment;\nexport const y = p["envs"];',
      ),
    ).toEqual({ names: [], unnamedCount: 0 });
  });

  it("process と無関係な env プロパティは集めない", () => {
    expect(
      collectFromSource(
        'const config = { env: { FOO: "x" } };\nexport const x = config.env.FOO;',
      ),
    ).toEqual({ names: [], unnamedCount: 0 });
  });
});

describe("本体コードの環境変数の読み取り", () => {
  it("process.env を変数名の分かる形でだけ読み、その名前はすべて CLI の環境変数と判定する", () => {
    const configPath = join(rootDir, "tsconfig.json");
    const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config, ts.sys, rootDir);
    const fileNames = parsed.fileNames.filter((path) => !isTestSource(path));
    const program = ts.createProgram(fileNames, parsed.options);

    const { names, unnamed } = collectEnvAccess(program, fileNames);

    expect(unnamed).toEqual([]);
    expect([...names]).toEqual(
      expect.arrayContaining(["KINTONE_DOMAIN", "SCHEMA_FILE_PATH", "VERBOSE"]),
    );
    expect([...names].filter((name) => !isCliEnvVar(name))).toEqual([]);
  }, 60_000);
});
