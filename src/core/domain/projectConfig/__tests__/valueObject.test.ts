import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { AppName } from "../valueObject";

describe("AppName", () => {
  it("creates an AppName from a string", () => {
    const name = AppName.create("customer");
    expect(name).toBe("customer");
  });

  it("preserves the string value", () => {
    const name = AppName.create("order");
    expect(name as string).toBe("order");
  });

  it("throws BusinessRuleError for empty string", () => {
    expect(() => AppName.create("")).toThrow(BusinessRuleError);
  });
});
