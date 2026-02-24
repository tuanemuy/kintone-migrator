import { describe, expect, it } from "vitest";
import { setupTestFormSchemaContainer } from "@/core/application/__tests__/helpers";
import { SystemError } from "@/core/application/error";
import { deployApp } from "../deployApp";

const getContainer = setupTestFormSchemaContainer();

describe("deployApp", () => {
  it("アプリのデプロイを実行する", async () => {
    const container = getContainer();

    await deployApp({ container });

    expect(container.appDeployer.deployCount).toBe(1);
  });

  it("複数回デプロイを実行できる", async () => {
    const container = getContainer();

    await deployApp({ container });
    await deployApp({ container });

    expect(container.appDeployer.deployCount).toBe(2);
  });

  it("デプロイ失敗時にSystemErrorを伝播する", async () => {
    const container = getContainer();
    container.appDeployer.setFailOn("deploy");

    await expect(deployApp({ container })).rejects.toThrow(SystemError);
  });
});
