import { describe, expect, it } from "vitest";
import {
  ConflictError,
  ConflictErrorCode,
  ForbiddenError,
  ForbiddenErrorCode,
  isConflictError,
  isForbiddenError,
  isNotFoundError,
  isSystemError,
  isUnauthenticatedError,
  isValidationError,
  NotFoundError,
  NotFoundErrorCode,
  SystemError,
  SystemErrorCode,
  UnauthenticatedError,
  UnauthenticatedErrorCode,
  ValidationError,
  ValidationErrorCode,
} from "../error";

describe("Application Error 型ガード", () => {
  describe("isNotFoundError", () => {
    it("NotFoundErrorインスタンスに対してtrueを返す", () => {
      const error = new NotFoundError(
        NotFoundErrorCode.NotFound,
        "見つかりません",
      );
      expect(isNotFoundError(error)).toBe(true);
    });

    it("他のエラー型に対してfalseを返す", () => {
      const error = new ValidationError(
        ValidationErrorCode.InvalidInput,
        "不正",
      );
      expect(isNotFoundError(error)).toBe(false);
    });

    it("プレーンなErrorに対してfalseを返す", () => {
      expect(isNotFoundError(new Error("test"))).toBe(false);
    });

    it("nullやundefinedに対してfalseを返す", () => {
      expect(isNotFoundError(null)).toBe(false);
      expect(isNotFoundError(undefined)).toBe(false);
    });
  });

  describe("isConflictError", () => {
    it("ConflictErrorインスタンスに対してtrueを返す", () => {
      const error = new ConflictError(ConflictErrorCode.Conflict, "競合");
      expect(isConflictError(error)).toBe(true);
    });

    it("他のエラー型に対してfalseを返す", () => {
      expect(isConflictError(new Error("test"))).toBe(false);
    });
  });

  describe("isUnauthenticatedError", () => {
    it("UnauthenticatedErrorインスタンスに対してtrueを返す", () => {
      const error = new UnauthenticatedError(
        UnauthenticatedErrorCode.AuthenticationRequired,
        "認証が必要です",
      );
      expect(isUnauthenticatedError(error)).toBe(true);
    });

    it("他のエラー型に対してfalseを返す", () => {
      expect(isUnauthenticatedError(new Error("test"))).toBe(false);
    });
  });

  describe("isForbiddenError", () => {
    it("ForbiddenErrorインスタンスに対してtrueを返す", () => {
      const error = new ForbiddenError(
        ForbiddenErrorCode.InsufficientPermissions,
        "権限不足",
      );
      expect(isForbiddenError(error)).toBe(true);
    });

    it("他のエラー型に対してfalseを返す", () => {
      expect(isForbiddenError(new Error("test"))).toBe(false);
    });
  });

  describe("isValidationError", () => {
    it("ValidationErrorインスタンスに対してtrueを返す", () => {
      const error = new ValidationError(
        ValidationErrorCode.InvalidInput,
        "入力不正",
      );
      expect(isValidationError(error)).toBe(true);
    });

    it("他のエラー型に対してfalseを返す", () => {
      expect(isValidationError(new Error("test"))).toBe(false);
    });
  });

  describe("isSystemError", () => {
    it("SystemErrorインスタンスに対してtrueを返す", () => {
      const error = new SystemError(
        SystemErrorCode.InternalServerError,
        "内部エラー",
      );
      expect(isSystemError(error)).toBe(true);
    });

    it("他のエラー型に対してfalseを返す", () => {
      expect(isSystemError(new Error("test"))).toBe(false);
    });
  });

  describe("エラーの cause チェーン", () => {
    it("cause 付きのエラーを作成できる", () => {
      const cause = new Error("原因");
      const error = new SystemError(
        SystemErrorCode.NetworkError,
        "ネットワークエラー",
        cause,
      );
      expect(error.cause).toBe(cause);
      expect(error.code).toBe("NETWORK_ERROR");
      expect(error.message).toBe("ネットワークエラー");
    });
  });

  describe("エラーコード", () => {
    it("各エラークラスは適切なコードを保持する", () => {
      expect(new NotFoundError(NotFoundErrorCode.NotFound, "test").code).toBe(
        "NOT_FOUND",
      );
      expect(new ConflictError(ConflictErrorCode.Conflict, "test").code).toBe(
        "CONFLICT",
      );
      expect(
        new UnauthenticatedError(
          UnauthenticatedErrorCode.AuthenticationRequired,
          "test",
        ).code,
      ).toBe("AUTHENTICATION_REQUIRED");
      expect(
        new ForbiddenError(ForbiddenErrorCode.InsufficientPermissions, "test")
          .code,
      ).toBe("INSUFFICIENT_PERMISSIONS");
      expect(
        new ValidationError(ValidationErrorCode.InvalidInput, "test").code,
      ).toBe("INVALID_INPUT");
      expect(new SystemError(SystemErrorCode.DatabaseError, "test").code).toBe(
        "DATABASE_ERROR",
      );
      expect(new SystemError(SystemErrorCode.StorageError, "test").code).toBe(
        "STORAGE_ERROR",
      );
      expect(
        new SystemError(SystemErrorCode.ExternalApiError, "test").code,
      ).toBe("EXTERNAL_API_ERROR");
    });
  });
});
