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
      "require からの分割代入",
      'const { env } = require("node:process");\nexport const x = env.FOO;',
    ],
    [
      "any の値からの改名つきの分割代入",
      "declare const p: any;\nconst { env: e } = p;\nexport const x = e.FOO;",
    ],
    [
      "any の値からのネストした分割代入",
      "declare const g: any;\nconst { process: { env } } = g;\nexport const x = env.FOO;",
    ],
    [
      "any の値からの計算されたプロパティ名の分割代入",
      'declare const p: any;\nconst k = "env";\nconst { [k]: e } = p;\nexport const x = e.FOO;',
    ],
    ["any の引数の分割代入", "export const f = ({ env }: any) => env.FOO;"],
    [
      "any の値からの分割代入式",
      "declare const p: any;\nlet env: any;\n({ env } = p);\nexport const x = env;",
    ],
    [
      "any の値からのネストした分割代入式",
      "declare const g: any;\nlet env: unknown;\n({ process: { env } } = g);\nexport const x = env;",
    ],
    [
      "型の付いた値の any のプロパティからの分割代入式",
      "declare const t: { a: any };\nlet env: unknown;\n({ a: { env } } = t);\nexport const x = env;",
    ],
    [
      "計算されたキーで any のプロパティを選ぶ分割代入式",
      'declare const t: { a: any; b: number };\ndeclare const k: "a" | "b";\nlet env: unknown;\n({ [k]: { env } } = t);\nexport const x = env;',
    ],
    [
      "計算されたキーで union の片側にだけある any のプロパティを選ぶ分割代入式",
      'declare const v: { a: any } | { b: number };\ndeclare const k: "a" | "b";\nlet env: unknown;\n({ [k]: { env } } = v);\nexport const x = env;',
    ],
    [
      "any の値からの計算されたキーの分割代入式",
      "declare const g: any;\ndeclare const k: string;\nlet e: unknown;\n({ [k]: e } = g);\nexport const x = e;",
    ],
    [
      "残余要素の内側の分割代入式",
      "declare const ps: any[];\nlet env: unknown;\n[...[{ env }]] = ps;\nexport const x = env;",
    ],
    [
      "any の配列の要素からの分割代入式",
      "declare const ps: any[];\nlet env: unknown;\n[{ env }] = ps;\nexport const x = env;",
    ],
    [
      "for-of の頭での分割代入",
      "declare const ps: any[];\nlet env: unknown;\nfor ({ env } of ps) {}\nexport const x = env;",
    ],
    [
      "for-of の頭でのネストした分割代入",
      "declare const rows: { a: any }[];\nlet env: unknown;\nfor ({ a: { env } } of rows) {}\nexport const x = env;",
    ],
    [
      "元の値が any で既定値の付いた分割代入式",
      "declare const t: { a: any };\nlet env: unknown;\n({ a: { env } = { env: 1 } } = t);\nexport const x = env;",
    ],
    [
      "既定値が any の分割代入式",
      "declare const t: { a?: { env: number } };\ndeclare const d: any;\nlet env: unknown;\n({ a: { env } = d } = t);\nexport const x = env;",
    ],
    [
      "既定値の付いた要素の内側の分割代入式",
      "declare const t: { a: any };\nlet env: unknown;\n({ a: { b: { env } } = { b: { env: 1 } } } = t);\nexport const x = env;",
    ],
    [
      "既定値の付いた配列の要素からの分割代入式",
      "declare const t: [any];\nlet env: unknown;\n[{ env } = { env: 1 }] = t;\nexport const x = env;",
    ],
    [
      "既定値の付いた宣言の分割代入",
      "declare const t: { a: any };\nconst { a: { env } = { env: 1 } } = t;\nexport const x = env;",
    ],
    [
      "要素の型が静的に決まらない分割代入式",
      "declare const s: Set<{ env: number }>;\nlet env: unknown;\n[{ env }] = s;\nexport const x = env;",
    ],
    [
      "型注釈の付いた宣言の any の初期化子からの分割代入",
      "declare const p: any;\nconst { env }: { env: Record<string, string> } = p;\nexport const x = env.FOO;",
    ],
    [
      "型注釈の付いた宣言の、any の初期化子から取り出す入れ子の分割代入",
      "declare const p: any;\nconst { a: { env } }: { a: { env: Record<string, string> } } = p;\nexport const x = env.FOO;",
    ],
    [
      "型注釈の付いた宣言の内側の any の既定値",
      "declare const t: { a?: { env: Record<string, string> } };\ndeclare const d: any;\nconst { a: { env } = d }: { a?: { env: Record<string, string> } } = t;\nexport const x = env.FOO;",
    ],
    [
      "型注釈の付いた引数の any の既定値",
      "declare const d: any;\nexport function f({ env }: { env: Record<string, string> } = d) {\n  return env.FOO;\n}",
    ],
    [
      "文脈から型の付く引数の any の既定値",
      "declare function use(f: (o: { env: Record<string, string> }) => string): void;\ndeclare const d: any;\nuse(({ env } = d) => env.FOO);",
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

  it("any の値から env 以外を分割代入しても集めない", () => {
    expect(
      collectFromSource(
        'declare const p: any;\nconst { argv, "cwd": c, ...env } = p;\nlet a: any;\nlet rest: any;\n({ a, ...rest } = p);\nexport const same = { env: 1 } === p;\nexport { argv, c, env, a, rest };',
      ),
    ).toEqual({ names: [], unnamedCount: 0 });
  });

  it("型の付いた値から env を分割代入しても、process と無関係なら集めない", () => {
    expect(
      collectFromSource(
        'const config = { env: { FOO: "x" } };\nconst { env } = config;\nconst { a: { env: e } = config }: { a?: { env: Record<string, string> } } = {};\nexport const f = ({ env: g } = config) => g.FOO;\nexport const x = env.FOO + e.FOO;',
      ),
    ).toEqual({ names: [], unnamedCount: 0 });
  });

  it("型の付いた値から env を分割代入式で取り出しても、process と無関係なら集めない", () => {
    expect(
      collectFromSource(
        [
          "declare const t: {",
          "  a?: { env: number };",
          "  b: { env: string }[];",
          "  c: [{ env: number }, any];",
          "  d: any;",
          "  e?: { f: { env: number } };",
          "};",
          'declare const k: "a" | "c";',
          "let env: unknown;",
          "let o: unknown;",
          "({ a: { env } } = { a: { env: 1 } });",
          "({ a: { env } = { env: 2 } } = t);",
          "({ [k]: { env } = { env: 3 } } = { a: { env: 4 }, c: { env: 5 } });",
          "({ e: { f: { env } } } = t);",
          "for ({ env } of t.b) {}",
          "for (const row of [{ env: t.d }]) {}",
          "[{ env }] = t.b;",
          "[{ env } = { env: 6 }] = t.c;",
          "({ b: [{ env }] } = t);",
          "o = { [k]: { env: 7 }, d: t.d };",
          "export { env, o };",
        ].join("\n"),
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
