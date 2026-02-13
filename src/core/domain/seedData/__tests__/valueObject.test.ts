import { describe, expect, it } from "vitest";
import { isBusinessRuleError } from "@/core/domain/error";
import { SeedDataErrorCode } from "../errorCode";
import { UpsertKey } from "../valueObject";

describe("UpsertKey", () => {
  it("非空文字列からUpsertKeyを作成する", () => {
    const key = UpsertKey.create("customer_code");
    expect(key).toBe("customer_code");
  });

  it("空文字列でBusinessRuleErrorをスローする", () => {
    try {
      UpsertKey.create("");
      expect.fail("Expected error");
    } catch (error) {
      expect(isBusinessRuleError(error)).toBe(true);
      if (isBusinessRuleError(error)) {
        expect(error.code).toBe(SeedDataErrorCode.EmptyUpsertKey);
      }
    }
  });
});
