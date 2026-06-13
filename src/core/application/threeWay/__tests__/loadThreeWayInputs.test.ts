import { describe, expect, it } from "vitest";
import {
  InMemoryFileStorage,
  testConfigCodec,
} from "../../__tests__/helpers/shared";
import { saveAppRevision } from "../../appRevisionIo";
import { loadThreeWayInputs } from "../loadThreeWayInputs";

type Snapshot = { value: string };

const serialize = (s: Snapshot): Record<string, unknown> => ({
  value: s.value,
});
const parse = (parsed: unknown): Snapshot => ({
  value: (parsed as { value: string }).value,
});

describe("threeWay loadThreeWayInputs", () => {
  it("state / baseRevision / local / remote を並列ロードする", async () => {
    const stateStorage = new InMemoryFileStorage();
    stateStorage.setContent(
      testConfigCodec.stringify(serialize({ value: "b" })),
    );
    const appRevisionStorage = new InMemoryFileStorage();
    await saveAppRevision(appRevisionStorage, testConfigCodec, "5");

    const inputs = await loadThreeWayInputs<Snapshot, { remote: string }>({
      codec: testConfigCodec,
      stateStorage,
      appRevisionStorage,
      parseState: parse,
      stateLabel: "Test state",
      loadLocal: async () => ({ value: "l" }),
      loadRemote: async () => ({ remote: "r" }),
    });

    expect(inputs.state).toEqual({ value: "b" });
    expect(inputs.baseRevision).toBe("5");
    expect(inputs.local).toEqual({ value: "l" });
    expect(inputs.remote).toEqual({ remote: "r" });
  });

  it("初回（state / revision なし）は undefined を返す", async () => {
    const inputs = await loadThreeWayInputs<Snapshot, { remote: string }>({
      codec: testConfigCodec,
      stateStorage: new InMemoryFileStorage(),
      appRevisionStorage: new InMemoryFileStorage(),
      parseState: parse,
      stateLabel: "Test state",
      loadLocal: async () => undefined,
      loadRemote: async () => ({ remote: "r" }),
    });

    expect(inputs.state).toBeUndefined();
    expect(inputs.baseRevision).toBeUndefined();
    expect(inputs.local).toBeUndefined();
    expect(inputs.remote).toEqual({ remote: "r" });
  });
});
