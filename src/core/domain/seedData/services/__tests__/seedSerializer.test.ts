import { describe, expect, it } from "vitest";
import type { SeedData } from "../../entity";
import type { UpsertKey } from "../../valueObject";
import { SeedSerializer } from "../seedSerializer";

describe("SeedSerializer", () => {
  it("SeedDataをYAMLにシリアライズする", () => {
    const seedData: SeedData = {
      key: "customer_code" as UpsertKey,
      records: [
        { customer_code: "C001", name: "テスト株式会社" },
        { customer_code: "C002", name: "サンプル株式会社" },
      ],
    };

    const result = SeedSerializer.serialize(seedData);
    expect(result).toContain("key: customer_code");
    expect(result).toContain("customer_code: C001");
    expect(result).toContain("name: テスト株式会社");
    expect(result).toContain("customer_code: C002");
    expect(result).toContain("name: サンプル株式会社");
  });

  it("配列フィールドをシリアライズする", () => {
    const seedData: SeedData = {
      key: "code" as UpsertKey,
      records: [{ code: "001", tags: ["VIP", "長期"] }],
    };

    const result = SeedSerializer.serialize(seedData);
    expect(result).toContain("VIP");
    expect(result).toContain("長期");
  });

  it("空レコード配列をシリアライズする", () => {
    const seedData: SeedData = {
      key: "code" as UpsertKey,
      records: [],
    };

    const result = SeedSerializer.serialize(seedData);
    expect(result).toContain("key: code");
    expect(result).toContain("records: []");
  });
});
