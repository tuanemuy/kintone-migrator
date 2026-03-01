import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { ProjectConfigErrorCode } from "../errorCode";
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

  it("スラッシュを含む名前はInvalidAppNameエラーが発生する", () => {
    try {
      AppName.create("my/app");
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        ProjectConfigErrorCode.PcInvalidAppName,
      );
    }
  });

  it("バックスラッシュを含む名前はInvalidAppNameエラーが発生する", () => {
    try {
      AppName.create("my\\app");
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        ProjectConfigErrorCode.PcInvalidAppName,
      );
    }
  });

  it("パス区切り以外の不正文字を含む名前はInvalidAppNameエラーが発生する", () => {
    for (const ch of [":", "*", "?", '"', "<", ">", "|"]) {
      try {
        AppName.create(`my${ch}app`);
        expect.unreachable(`should throw for "${ch}"`);
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessRuleError);
        expect((e as BusinessRuleError).code).toBe(
          ProjectConfigErrorCode.PcInvalidAppName,
        );
      }
    }
  });

  it("制御文字を含む名前はInvalidAppNameエラーが発生する", () => {
    try {
      AppName.create("my\x00app");
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        ProjectConfigErrorCode.PcInvalidAppName,
      );
    }
  });

  it("DEL文字(0x7f)を含む名前はInvalidAppNameエラーが発生する", () => {
    try {
      AppName.create("my\x7fapp");
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        ProjectConfigErrorCode.PcInvalidAppName,
      );
    }
  });

  it('予約パスコンポーネント "." はInvalidAppNameエラーが発生する', () => {
    try {
      AppName.create(".");
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        ProjectConfigErrorCode.PcInvalidAppName,
      );
    }
  });

  it('予約パスコンポーネント ".." はInvalidAppNameエラーが発生する', () => {
    try {
      AppName.create("..");
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessRuleError);
      expect((e as BusinessRuleError).code).toBe(
        ProjectConfigErrorCode.PcInvalidAppName,
      );
    }
  });
});
