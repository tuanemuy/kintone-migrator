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
  UnauthenticatedError,
  UnauthenticatedErrorCode,
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
  .mockImplementation((_code?) => undefined as never);

import * as p from "@clack/prompts";
import { handleCliError } from "../handleError";

afterEach(() => {
  vi.clearAllMocks();
});

describe("handleCliError", () => {
  it("BusinessRuleError を受け取ると [BusinessRuleError] のフォーマットでログ出力し process.exit(1) する", () => {
    const error = new BusinessRuleError(
      FormSchemaErrorCode.FsEmptyFieldCode,
      "フィールドコードが空です",
    );

    handleCliError(error);

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("[BusinessRuleError]"),
    );
    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining(FormSchemaErrorCode.FsEmptyFieldCode),
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

  it("NotFoundError を受け取ると [NotFoundError] のフォーマットとヒントメッセージでログ出力し process.exit(1) する", () => {
    const error = new NotFoundError(
      NotFoundErrorCode.NotFound,
      "リソースが見つかりません",
    );

    handleCliError(error);

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("[NotFoundError]"),
    );
    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining(NotFoundErrorCode.NotFound),
    );
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("Hint: The specified resource was not found"),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("ConflictError を受け取ると [ConflictError] のフォーマットとヒントメッセージでログ出力する", () => {
    const error = new ConflictError(
      ConflictErrorCode.Conflict,
      "リビジョンが競合しました",
    );

    handleCliError(error);

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("[ConflictError]"),
    );
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("Hint: A conflict was detected"),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("UnauthenticatedError を受け取ると [UnauthenticatedError] のフォーマットとヒントメッセージでログ出力する", () => {
    const error = new UnauthenticatedError(
      UnauthenticatedErrorCode.InvalidCredentials,
      "認証に失敗しました",
    );

    handleCliError(error);

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("[UnauthenticatedError]"),
    );
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("Hint: Authentication failed"),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("ForbiddenError を受け取ると [ForbiddenError] のフォーマットとヒントメッセージでログ出力する", () => {
    const error = new ForbiddenError(
      ForbiddenErrorCode.InsufficientPermissions,
      "権限がありません",
    );

    handleCliError(error);

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("[ForbiddenError]"),
    );
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("Hint: Insufficient permissions"),
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

  it("cause に errors プロパティがある場合、エラー詳細が warn でログ出力される", () => {
    const cause = { errors: [{ message: "field1 is invalid" }] };
    const error = new SystemError(
      SystemErrorCode.ExternalApiError,
      "APIエラー",
      cause,
    );

    handleCliError(error);

    expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining("Cause:"));
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("field1 is invalid"),
    );
  });

  it("cause に error (単数) プロパティがある場合、内部エラーの詳細が warn でログ出力される", () => {
    // KintoneAllRecordsError のように .error (単数) プロパティでラップされるケース
    const innerError = new Error(
      "[400] [CB_VA01] 入力内容が正しくありません。 (abc-123)",
    );
    Object.assign(innerError, {
      errors: {
        "records[0].field1.value": {
          messages: ["必須です。"],
        },
      },
    });
    const cause = Object.assign(
      new Error("0/5 records are processed successfully"),
      { error: innerError },
    );
    const error = new SystemError(
      SystemErrorCode.ExternalApiError,
      "Failed to add records",
      cause,
    );

    handleCliError(error);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("0/5 records are processed successfully"),
    );
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("[400] [CB_VA01]"),
    );
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("必須です。"),
    );
  });

  it("cause のcauseチェーンを再帰的にたどって表示する", () => {
    const rootCause = new Error("connection refused");
    const midCause = new Error("API call failed", { cause: rootCause });
    const error = new SystemError(
      SystemErrorCode.NetworkError,
      "ネットワークエラー",
      midCause,
    );

    handleCliError(error);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("API call failed"),
    );
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("Caused by: connection refused"),
    );
  });

  it("stack トレースがある場合、Stack 情報が warn でログ出力される", () => {
    const error = new Error("テストエラー");

    handleCliError(error);

    expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining("Stack:"));
  });
});
