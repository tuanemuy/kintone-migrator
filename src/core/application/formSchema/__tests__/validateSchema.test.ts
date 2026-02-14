import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SystemError } from "@/core/application/error";
import { validateSchema } from "../validateSchema";

describe("validateSchema", () => {
  let tempDir: string;
  let tempFile: string;

  beforeEach(() => {
    tempDir = tmpdir();
    tempFile = join(tempDir, `test-schema-${Date.now()}.yaml`);
  });

  afterEach(async () => {
    try {
      const { unlink } = await import("node:fs/promises");
      await unlink(tempFile);
    } catch {
      // ignore
    }
  });

  it("正常なスキーマファイルの場合、validationResult を返す", async () => {
    const yaml = `
layout:
  - type: ROW
    fields:
      - code: name
        type: SINGLE_LINE_TEXT
        label: 名前
`;
    await writeFile(tempFile, yaml, "utf-8");
    const result = await validateSchema({ schemaFilePath: tempFile });
    expect(result.parseError).toBeUndefined();
    expect(result.validationResult).toBeDefined();
    expect(result.validationResult?.isValid).toBe(true);
    expect(result.fieldCount).toBe(1);
  });

  it("バリデーションエラーがあるスキーマの場合、issues を含む validationResult を返す", async () => {
    const yaml = `
layout:
  - type: ROW
    fields:
      - code: name
        type: SINGLE_LINE_TEXT
        label: ""
`;
    await writeFile(tempFile, yaml, "utf-8");
    const result = await validateSchema({ schemaFilePath: tempFile });
    expect(result.parseError).toBeUndefined();
    expect(result.validationResult).toBeDefined();
    expect(result.validationResult?.isValid).toBe(false);
    expect(result.validationResult?.issues.length).toBeGreaterThan(0);
  });

  it("パースエラーがあるスキーマの場合、parseError を返す", async () => {
    await writeFile(tempFile, "{{invalid yaml", "utf-8");
    const result = await validateSchema({ schemaFilePath: tempFile });
    expect(result.parseError).toBeDefined();
    expect(result.validationResult).toBeUndefined();
    expect(result.fieldCount).toBe(0);
  });

  it("空のスキーマテキストの場合、parseError を返す", async () => {
    await writeFile(tempFile, "", "utf-8");
    const result = await validateSchema({ schemaFilePath: tempFile });
    expect(result.parseError).toBeDefined();
    expect(result.fieldCount).toBe(0);
  });

  it("存在しないファイルパスの場合、SystemError をスローする", async () => {
    await expect(
      validateSchema({ schemaFilePath: "/nonexistent/path/schema.yaml" }),
    ).rejects.toThrow(SystemError);
  });

  it("複数フィールドを含むスキーマの fieldCount が正しい", async () => {
    const yaml = `
layout:
  - type: ROW
    fields:
      - code: f1
        type: SINGLE_LINE_TEXT
        label: フィールド1
      - code: f2
        type: NUMBER
        label: フィールド2
      - code: f3
        type: DATE
        label: フィールド3
`;
    await writeFile(tempFile, yaml, "utf-8");
    const result = await validateSchema({ schemaFilePath: tempFile });
    expect(result.fieldCount).toBe(3);
  });
});
