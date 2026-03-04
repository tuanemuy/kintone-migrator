import { KintoneRestAPIError } from "@kintone/rest-api-client";
import { describe, expect, it } from "vitest";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  SystemError,
  SystemErrorCode,
  UnauthenticatedError,
  ValidationError,
  ValidationErrorCode,
} from "@/core/application/error";
import { BusinessRuleError } from "@/core/domain/error";
import { FormSchemaErrorCode } from "@/core/domain/formSchema/errorCode";
import { wrapKintoneError } from "../wrapKintoneError";

function createKintoneAPIError(
  status: number,
  code = "SOME_CODE",
): KintoneRestAPIError {
  return new KintoneRestAPIError({
    status,
    statusText: "Error",
    data: { id: "test-id", code, message: "test error" },
    headers: {},
  });
}

describe("wrapKintoneError", () => {
  const message = "Failed to do something";

  describe("pass-through", () => {
    it("BusinessRuleError をそのまま再スローする", () => {
      const error = new BusinessRuleError(
        FormSchemaErrorCode.FsInvalidSchemaStructure,
        "domain error",
      );
      expect(() => wrapKintoneError(error, message)).toThrow(error);
    });

    it("SystemError をそのまま再スローする", () => {
      const error = new SystemError(
        SystemErrorCode.ExternalApiError,
        "existing system error",
      );
      expect(() => wrapKintoneError(error, message)).toThrow(error);
    });

    it("ValidationError をそのまま再スローする", () => {
      const error = new ValidationError(
        ValidationErrorCode.InvalidInput,
        "validation error",
      );
      expect(() => wrapKintoneError(error, message)).toThrow(error);
    });

    it("NotFoundError をそのまま再スローする", () => {
      const error = new NotFoundError("NOT_FOUND", "not found");
      expect(() => wrapKintoneError(error, message)).toThrow(error);
    });

    it("ConflictError をそのまま再スローする", () => {
      const error = new ConflictError("CONFLICT", "conflict");
      expect(() => wrapKintoneError(error, message)).toThrow(error);
    });

    it("ForbiddenError をそのまま再スローする", () => {
      const error = new ForbiddenError("INSUFFICIENT_PERMISSIONS", "forbidden");
      expect(() => wrapKintoneError(error, message)).toThrow(error);
    });

    it("UnauthenticatedError をそのまま再スローする", () => {
      const error = new UnauthenticatedError(
        "INVALID_CREDENTIALS",
        "unauthenticated",
      );
      expect(() => wrapKintoneError(error, message)).toThrow(error);
    });
  });

  describe("KintoneRestAPIError のHTTPステータスマッピング", () => {
    it("401 → UnauthenticatedError", () => {
      const error = createKintoneAPIError(401);
      expect(() => wrapKintoneError(error, message)).toThrow(
        UnauthenticatedError,
      );
    });

    it("403 → ForbiddenError", () => {
      const error = createKintoneAPIError(403);
      expect(() => wrapKintoneError(error, message)).toThrow(ForbiddenError);
    });

    it("403 GAIA_NO02 → SystemError (メンテナンスモード)", () => {
      const error = createKintoneAPIError(403, "GAIA_NO02");
      expect(() => wrapKintoneError(error, message)).toThrow(SystemError);
    });

    it("403 GAIA_NO02 のメッセージにメンテナンスモード情報と元エラーメッセージが付加される", () => {
      const error = createKintoneAPIError(403, "GAIA_NO02");
      expect(() => wrapKintoneError(error, message)).toThrow(
        /maintenance mode/,
      );
      expect(() => wrapKintoneError(error, message)).toThrow(/test error/);
    });

    it("404 → NotFoundError", () => {
      const error = createKintoneAPIError(404);
      expect(() => wrapKintoneError(error, message)).toThrow(NotFoundError);
    });

    it("409 → ConflictError", () => {
      const error = createKintoneAPIError(409);
      expect(() => wrapKintoneError(error, message)).toThrow(ConflictError);
    });

    it("GAIA_CO02 コード → ConflictError (リビジョンコンフリクト)", () => {
      const error = createKintoneAPIError(400, "GAIA_CO02");
      expect(() => wrapKintoneError(error, message)).toThrow(ConflictError);
    });

    it("GAIA_CO02 のメッセージにリビジョンコンフリクト情報が付加される", () => {
      const error = createKintoneAPIError(400, "GAIA_CO02");
      expect(() => wrapKintoneError(error, message)).toThrow(
        /revision conflict/,
      );
    });

    it("400 (非GAIA_CO02) → ValidationError", () => {
      const error = createKintoneAPIError(400, "CB_VA01");
      expect(() => wrapKintoneError(error, message)).toThrow(ValidationError);
    });

    it("その他のHTTPステータス → SystemError", () => {
      const error = createKintoneAPIError(500);
      expect(() => wrapKintoneError(error, message)).toThrow(SystemError);
    });
  });

  describe("その他のエラー", () => {
    it("一般的な Error → SystemError", () => {
      const error = new Error("generic error");
      expect(() => wrapKintoneError(error, message)).toThrow(SystemError);
    });

    it("文字列 → SystemError", () => {
      expect(() => wrapKintoneError("string error", message)).toThrow(
        SystemError,
      );
    });
  });

  describe("エラーメッセージの伝搬", () => {
    it("KintoneRestAPIError のメッセージが付加される", () => {
      const error = createKintoneAPIError(401);
      expect(() => wrapKintoneError(error, message)).toThrow(
        /Failed to do something: .+test error/,
      );
    });

    it("cause に元のエラーが設定される", () => {
      const error = createKintoneAPIError(401);
      expect(() => wrapKintoneError(error, message)).toThrow(
        expect.objectContaining({ cause: error }),
      );
    });

    it("一般的な Error のメッセージも付加される", () => {
      const error = new Error("network timeout");
      expect(() => wrapKintoneError(error, message)).toThrow(
        /Failed to do something: network timeout/,
      );
    });

    it("一般的な Error の cause が保持される", () => {
      const error = new Error("generic");
      expect(() => wrapKintoneError(error, message)).toThrow(
        expect.objectContaining({ cause: error }),
      );
    });

    it("GAIA_CO02 にリトライ案内が含まれる", () => {
      const error = createKintoneAPIError(400, "GAIA_CO02");
      expect(() => wrapKintoneError(error, message)).toThrow(
        /Please retry the operation/,
      );
    });
  });
});
