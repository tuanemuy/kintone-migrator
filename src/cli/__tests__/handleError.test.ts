import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    info: vi.fn(),
  },
  outro: vi.fn(),
}));

// process.exit をモック（never 返却を回避）
const mockExit = vi
  .spyOn(process, "exit")
  .mockImplementation((_code?) => undefined as never);

import * as p from "@clack/prompts";
import {
  formatErrorForDisplay,
  handleCliError,
  logError,
} from "../handleError";

beforeEach(() => {
  delete process.env.VERBOSE;
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
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

  it("VERBOSE=1 の場合、stack トレースが warn でログ出力される", () => {
    process.env.VERBOSE = "1";
    const error = new Error("テストエラー");

    handleCliError(error);

    expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining("Stack:"));
  });

  it("VERBOSE=true の場合、stack トレースが warn でログ出力される", () => {
    process.env.VERBOSE = "true";
    const error = new Error("テストエラー");

    handleCliError(error);

    expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining("Stack:"));
  });

  it("VERBOSE 未設定の場合、Stack 情報は出力されない", () => {
    delete process.env.VERBOSE;
    const error = new Error("テストエラー");

    handleCliError(error);

    const warnCalls = vi.mocked(p.log.warn).mock.calls;
    const hasStack = warnCalls.some(
      (call) => typeof call[0] === "string" && call[0].includes("Stack:"),
    );
    expect(hasStack).toBe(false);
  });

  it("VERBOSE=yes など無効な値の場合、Stack 情報は出力されない", () => {
    process.env.VERBOSE = "yes";
    const error = new Error("テストエラー");

    handleCliError(error);

    const warnCalls = vi.mocked(p.log.warn).mock.calls;
    const hasStack = warnCalls.some(
      (call) => typeof call[0] === "string" && call[0].includes("Stack:"),
    );
    expect(hasStack).toBe(false);
  });

  it("ValidationError のヒントメッセージが出力される", () => {
    const error = new ValidationError(
      ValidationErrorCode.InvalidInput,
      "入力値が不正です",
    );

    handleCliError(error);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("Hint: Please check your input values"),
    );
  });

  it("SystemError(NetworkError) のヒントメッセージが出力される", () => {
    const error = new SystemError(
      SystemErrorCode.NetworkError,
      "ネットワーク接続失敗",
    );

    handleCliError(error);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("Hint: Please check your network connection"),
    );
  });

  it("SystemError(ExternalApiError) のヒントメッセージが出力される", () => {
    const error = new SystemError(
      SystemErrorCode.ExternalApiError,
      "API エラー",
    );

    handleCliError(error);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "Hint: The kintone API returned an unexpected error",
      ),
    );
  });

  it("cause にセンシティブ情報が含まれる場合、[REDACTED] で出力される", () => {
    const cause = {
      errors: [
        {
          message: "auth failed",
          authorization: "Basic abc123",
          password: "secret123",
        },
      ],
    };
    const error = new SystemError(
      SystemErrorCode.ExternalApiError,
      "APIエラー",
      cause,
    );

    logError(error);

    const warnCalls = vi.mocked(p.log.warn).mock.calls;
    const hasRedacted = warnCalls.some(
      (call) => typeof call[0] === "string" && call[0].includes("[REDACTED]"),
    );
    expect(hasRedacted).toBe(true);

    const hasPlainPassword = warnCalls.some(
      (call) => typeof call[0] === "string" && call[0].includes("secret123"),
    );
    expect(hasPlainPassword).toBe(false);
  });

  it("VERBOSE 未設定の場合、VERBOSE ヒントが表示される", () => {
    delete process.env.VERBOSE;
    const error = new Error("テストエラー");

    handleCliError(error);

    expect(p.log.info).toHaveBeenCalledWith(
      "Set VERBOSE=1 for full stack traces.",
    );
  });

  it("VERBOSE=1 の場合、VERBOSE ヒントは表示されない", () => {
    process.env.VERBOSE = "1";
    const error = new Error("テストエラー");

    handleCliError(error);

    expect(p.log.info).not.toHaveBeenCalledWith(
      "Set VERBOSE=1 for full stack traces.",
    );
  });

  it("非 Error 型の場合でも、VERBOSE ヒントが表示される", () => {
    delete process.env.VERBOSE;

    handleCliError("文字列エラー");

    expect(p.log.info).toHaveBeenCalledWith(
      "Set VERBOSE=1 for full stack traces.",
    );
  });
});

describe("logError", () => {
  it("process.exit を呼ばずにエラーログだけ出力する", () => {
    const error = new SystemError(
      SystemErrorCode.ExternalApiError,
      "APIエラー",
    );

    logError(error);

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("[SystemError]"),
    );
    expect(mockExit).not.toHaveBeenCalled();
    expect(p.outro).not.toHaveBeenCalled();
  });

  it("通常の Error を受け取ると [Error] で出力する", () => {
    logError(new Error("一般エラー"));

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("[Error] 一般エラー"),
    );
  });

  it("Error でない値を受け取ると文字列化して出力する", () => {
    logError({ code: 500, message: "unknown" });

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("Unexpected error"),
    );
  });

  it("cause に .error (非 Error) と .errors (object) がある場合、.errors が出力される", () => {
    const cause = {
      error: "not-an-error-instance",
      errors: { field1: { messages: ["必須です"] } },
    };
    const error = new SystemError(
      SystemErrorCode.ExternalApiError,
      "APIエラー",
      cause,
    );

    logError(error);

    const warnCalls = vi.mocked(p.log.warn).mock.calls;
    const hasDetails = warnCalls.some(
      (call) => typeof call[0] === "string" && call[0].includes("必須です"),
    );
    expect(hasDetails).toBe(true);
  });
});

describe("formatErrorForDisplay", () => {
  it("Error メッセージ内のセンシティブ値をマスクする", () => {
    const result = formatErrorForDisplay(
      new Error("Failed: apiToken=abc123xyz"),
    );
    expect(result).not.toContain("abc123xyz");
    expect(result).toContain("[REDACTED]");
  });

  it("authorization=Bearer <token> パターンでトークンがリークしない", () => {
    const result = formatErrorForDisplay(
      new Error("Failed: authorization=Bearer token123secret"),
    );
    expect(result).not.toContain("Bearer");
    expect(result).not.toContain("token123secret");
    expect(result).toContain("[REDACTED]");
  });

  it("authorization: <value> パターンでもマスクされる", () => {
    const result = formatErrorForDisplay(
      new Error("authorization: Basic dXNlcjpwYXNz"),
    );
    expect(result).not.toContain("dXNlcjpwYXNz");
    expect(result).toContain("[REDACTED]");
  });

  it("password=value パターンでメッセージ内の値がマスクされる", () => {
    const result = formatErrorForDisplay(
      new Error("Login failed: password=mysecretpass"),
    );
    expect(result).not.toContain("mysecretpass");
    expect(result).toContain("[REDACTED]");
  });

  it("プレーンオブジェクトのセンシティブキーをマスクする", () => {
    const result = formatErrorForDisplay({
      password: "my-secret",
      user: "admin",
    });
    expect(result).toContain("[REDACTED]");
    expect(result).not.toContain("my-secret");
    expect(result).toContain("admin");
  });

  it("api_token キーがマスクされる", () => {
    const result = formatErrorForDisplay({
      api_token: "secret-token-value",
      app_id: "123",
    });
    expect(result).toContain("[REDACTED]");
    expect(result).not.toContain("secret-token-value");
    expect(result).toContain("123");
  });

  it("credentials キーがマスクされる", () => {
    const result = formatErrorForDisplay({
      credentials: "user:pass",
      domain: "example.com",
    });
    expect(result).toContain("[REDACTED]");
    expect(result).not.toContain("user:pass");
    expect(result).toContain("example.com");
  });

  it("循環参照を含むオブジェクトでもスタックオーバーフローしない", () => {
    const obj: Record<string, unknown> = { name: "test" };
    obj.self = obj;

    const result = formatErrorForDisplay(obj);
    expect(result).toContain("[Circular]");
    expect(result).toContain("test");
  });
});

describe("cause chain sanitization", () => {
  it("循環 cause チェーンでもスタックオーバーフローしない", () => {
    const errorA = new Error("Error A");
    const errorB = new Error("Error B", { cause: errorA });
    // Create circular cause chain: A -> B -> A
    (errorA as unknown as Record<string, unknown>).cause = errorB;
    const error = new SystemError(
      SystemErrorCode.NetworkError,
      "ネットワークエラー",
      errorA,
    );

    // Should not throw (no infinite recursion)
    expect(() => logError(error)).not.toThrow();
  });

  it("cause 内の inner error message に含まれるセンシティブ値がサニタイズされる", () => {
    const innerError = new Error("request failed: apiToken=secret123");
    Object.assign(innerError, {
      errors: { field1: { messages: ["invalid"] } },
    });
    const cause = Object.assign(new Error("bulk operation failed"), {
      error: innerError,
    });
    const error = new SystemError(
      SystemErrorCode.ExternalApiError,
      "API failed",
      cause,
    );

    logError(error);

    const warnCalls = vi.mocked(p.log.warn).mock.calls;
    const hasPlainSecret = warnCalls.some(
      (call) => typeof call[0] === "string" && call[0].includes("secret123"),
    );
    expect(hasPlainSecret).toBe(false);

    const hasRedacted = warnCalls.some(
      (call) => typeof call[0] === "string" && call[0].includes("[REDACTED]"),
    );
    expect(hasRedacted).toBe(true);
  });

  it("cause の errors 配列内の Error message もサニタイズされる", () => {
    const cause = {
      errors: [new Error("authorization=Bearer leaked-token-value")],
    };
    const error = new SystemError(
      SystemErrorCode.ExternalApiError,
      "API failed",
      cause,
    );

    logError(error);

    const warnCalls = vi.mocked(p.log.warn).mock.calls;
    const hasLeakedToken = warnCalls.some(
      (call) =>
        typeof call[0] === "string" && call[0].includes("leaked-token-value"),
    );
    expect(hasLeakedToken).toBe(false);
  });
});
