import { KintoneRestAPIError } from "@kintone/rest-api-client";
import { describe, expect, it } from "vitest";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  SystemError,
  SystemErrorCode,
  UnauthenticatedError,
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
    it("指定されたメッセージがエラーに設定される", () => {
      const error = createKintoneAPIError(401);
      try {
        wrapKintoneError(error, message);
      } catch (e) {
        expect(e).toBeInstanceOf(UnauthenticatedError);
        expect((e as UnauthenticatedError).message).toBe(message);
        expect((e as UnauthenticatedError).cause).toBe(error);
      }
    });
  });
});
