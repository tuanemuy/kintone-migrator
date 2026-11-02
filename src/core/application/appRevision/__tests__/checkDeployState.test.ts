import { describe, expect, it } from "vitest";
import { NotFoundError, NotFoundErrorCode } from "@/core/application/error";
import type { AppRevisionGenerationsReader } from "@/core/domain/appRevision/ports/appRevisionGenerationsReader";
import type { AppRevisionGenerations } from "@/core/domain/appRevision/valueObject";
import { checkDeployState } from "../checkDeployState";

function readerReturning(
  generations: AppRevisionGenerations,
): AppRevisionGenerationsReader {
  return { read: async () => generations };
}

describe("checkDeployState", () => {
  it("両世代の revision が一致すれば upToDate を返す", async () => {
    const state = await checkDeployState({
      container: {
        appRevisionGenerationsReader: readerReturning({
          preview: "4",
          published: { kind: "deployed", revision: "4" },
        }),
      },
    });

    expect(state).toEqual({ kind: "upToDate", revision: "4" });
  });

  it("preview が進んでいれば pending を返す", async () => {
    const state = await checkDeployState({
      container: {
        appRevisionGenerationsReader: readerReturning({
          preview: "5",
          published: { kind: "deployed", revision: "4" },
        }),
      },
    });

    expect(state).toEqual({
      kind: "pending",
      previewRevision: "5",
      publishedRevision: "4",
    });
  });

  it("published が無ければ neverDeployed を返す", async () => {
    const state = await checkDeployState({
      container: {
        appRevisionGenerationsReader: readerReturning({
          preview: "2",
          published: { kind: "neverDeployed" },
        }),
      },
    });

    expect(state).toEqual({ kind: "neverDeployed", previewRevision: "2" });
  });

  it("読み取りのエラーはそのまま伝わる", async () => {
    const error = new NotFoundError(NotFoundErrorCode.NotFound, "missing");

    await expect(
      checkDeployState({
        container: {
          appRevisionGenerationsReader: {
            read: async () => {
              throw error;
            },
          },
        },
      }),
    ).rejects.toBe(error);
  });
});
