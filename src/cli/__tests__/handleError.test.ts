import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ConflictError,
  ConflictErrorCode,
  ForbiddenError,
  ForbiddenErrorCode,
  NotFoundError,
  NotFoundErrorCode,
  SystemError,
  SystemErrorCode,
  ValidationError,
  ValidationErrorCode,
} from "@/core/application/error";
import { BusinessRuleError } from "@/core/domain/error";
import { FormSchemaErrorCode } from "@/core/domain/formSchema/errorCode";

// @clack/prompts をモック
vi.mock("@clack/prompts", () => ({
  log: {
    error: vi.fn(),
    warn: vi.fn(),
  },
  outro: vi.fn(),
}));

// process.exit をモック（never 返却を回避）
const mockExit = vi
  .spyOn(process, "exit")
  .mockImplementation((() => {}) as unknown as (
    code?: string | number | null,
  ) => never);

import * as p from "@clack/prompts";
import { handleCliError } from "../handleError";

afterEach(() => {
  vi.clearAllMocks();
});

describe("handleCliError", () => {
  it("BusinessRuleError を受け取ると [BusinessRuleError] のフォーマットでログ出力し process.exit(1) する", () => {
    const error = new BusinessRuleError(
      FormSchemaErrorCode.EmptyFieldCode,
      "フィールドコードが空です",
    );

    handleCliError(error);

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("[BusinessRuleError]"),
    );
    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining(FormSchemaErrorCode.EmptyFieldCode),
    );
    expect(p.outro).toHaveBeenCalledWith("Failed.");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("ValidationError を受け取ると [ValidationError] のフォーマットでログ出力し process.exit(1) する", () => {
    const error = new ValidationError(
      ValidationErrorCode.InvalidInput,
      "入力値が不正です",
    );

    handleCliError(error);

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("[ValidationError]"),
    );
    expect(p.outro).toHaveBeenCalledWith("Failed.");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("SystemError を受け取ると [SystemError] のフォーマットでログ出力し process.exit(1) する", () => {
    const error = new SystemError(
      SystemErrorCode.ExternalApiError,
      "API接続に失敗しました",
    );

    handleCliError(error);

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("[SystemError]"),
    );
    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining(SystemErrorCode.ExternalApiError),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("NotFoundError（ApplicationError系）を受け取ると [NotFoundError] のフォーマットでログ出力し process.exit(1) する", () => {
    const error = new NotFoundError(
      NotFoundErrorCode.NotFound,
      "リソースが見つかりません",
    );

    handleCliError(error);

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("[NotFoundError]"),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("ConflictError を受け取ると [ConflictError] のフォーマットでログ出力する", () => {
    const error = new ConflictError(
      ConflictErrorCode.Conflict,
      "リビジョンが競合しました",
    );

    handleCliError(error);

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("[ConflictError]"),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("ForbiddenError を受け取ると [ForbiddenError] のフォーマットでログ出力する", () => {
    const error = new ForbiddenError(
      ForbiddenErrorCode.InsufficientPermissions,
      "権限がありません",
    );

    handleCliError(error);

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("[ForbiddenError]"),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("通常の Error を受け取ると [Error] のフォーマットでログ出力し process.exit(1) する", () => {
    const error = new Error("予期しないエラー");

    handleCliError(error);

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("[Error]"),
    );
    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("予期しないエラー"),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("Error でも ApplicationError でもない値を受け取ると文字列化してログ出力する", () => {
    handleCliError("文字列エラー");

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("文字列エラー"),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("数値を受け取ると文字列化してログ出力する", () => {
    handleCliError(42);

    expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining("42"));
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("cause を持つエラーの場合、Cause 情報が warn でログ出力される", () => {
    const cause = new Error("原因エラー");
    const error = new SystemError(
      SystemErrorCode.NetworkError,
      "ネットワークエラー",
      cause,
    );

    handleCliError(error);

    expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining("Cause:"));
  });

  it("cause に errors プロパティがある場合、Details が warn でログ出力される", () => {
    const cause = { errors: [{ message: "field1 is invalid" }] };
    const error = new SystemError(
      SystemErrorCode.ExternalApiError,
      "APIエラー",
      cause,
    );

    handleCliError(error);

    expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining("Cause:"));
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("Details:"),
    );
  });

  it("stack トレースがある場合、Stack 情報が warn でログ出力される", () => {
    const error = new Error("テストエラー");

    handleCliError(error);

    expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining("Stack:"));
  });
});
