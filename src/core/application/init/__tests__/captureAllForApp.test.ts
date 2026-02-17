import { describe, expect, it } from "vitest";
import {
  ForbiddenError,
  ForbiddenErrorCode,
  SystemError,
  SystemErrorCode,
  UnauthenticatedError,
  UnauthenticatedErrorCode,
  ValidationError,
  ValidationErrorCode,
} from "@/core/application/error";
import { isFatalError } from "../captureAllForApp";

describe("isFatalError", () => {
  it("UnauthenticatedError を致命的と判定する", () => {
    const error = new UnauthenticatedError(
      UnauthenticatedErrorCode.InvalidCredentials,
      "Invalid credentials",
    );
    expect(isFatalError(error)).toBe(true);
  });

  it("ForbiddenError を致命的と判定する", () => {
    const error = new ForbiddenError(
      ForbiddenErrorCode.InsufficientPermissions,
      "Forbidden",
    );
    expect(isFatalError(error)).toBe(true);
  });

  it("SystemError(NetworkError) を致命的と判定する", () => {
    const error = new SystemError(
      SystemErrorCode.NetworkError,
      "Network error",
    );
    expect(isFatalError(error)).toBe(true);
  });

  it("SystemError(ExternalApiError) は致命的と判定しない", () => {
    const error = new SystemError(
      SystemErrorCode.ExternalApiError,
      "API error",
    );
    expect(isFatalError(error)).toBe(false);
  });

  it("SystemError(StorageError) は致命的と判定しない", () => {
    const error = new SystemError(
      SystemErrorCode.StorageError,
      "Storage error",
    );
    expect(isFatalError(error)).toBe(false);
  });

  it("ValidationError は致命的と判定しない", () => {
    const error = new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Validation error",
    );
    expect(isFatalError(error)).toBe(false);
  });

  it("通常の Error は致命的と判定しない", () => {
    const error = new Error("generic error");
    expect(isFatalError(error)).toBe(false);
  });

  it("null は致命的と判定しない", () => {
    expect(isFatalError(null)).toBe(false);
  });
});
