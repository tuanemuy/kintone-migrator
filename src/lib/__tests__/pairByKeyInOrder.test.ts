import { describe, expect, it } from "vitest";
import { pairByKeyInOrder } from "../pairByKeyInOrder";

const keyOf = (item: string) => item[0];

describe("pairByKeyInOrder", () => {
  it("pairs items sharing a key by their order of appearance", () => {
    const result = pairByKeyInOrder(
      ["a1", "b1", "a2"],
      ["a3", "a4", "b2"],
      keyOf,
    );

    expect(result).toEqual([
      { kind: "both", key: "a", index: 0, local: "a1", remote: "a3" },
      { kind: "both", key: "a", index: 1, local: "a2", remote: "a4" },
      { kind: "both", key: "b", index: 0, local: "b1", remote: "b2" },
    ]);
  });

  it("returns the extra local items of a shared key as localOnly", () => {
    const result = pairByKeyInOrder(["a1", "a2", "a3"], ["a4"], keyOf);

    expect(result).toEqual([
      { kind: "both", key: "a", index: 0, local: "a1", remote: "a4" },
      { kind: "localOnly", key: "a", index: 1, local: "a2" },
      { kind: "localOnly", key: "a", index: 2, local: "a3" },
    ]);
  });

  it("returns the extra remote items of a shared key as remoteOnly", () => {
    const result = pairByKeyInOrder(["a1"], ["a2", "a3"], keyOf);

    expect(result).toEqual([
      { kind: "both", key: "a", index: 0, local: "a1", remote: "a2" },
      { kind: "remoteOnly", key: "a", index: 1, remote: "a3" },
    ]);
  });

  it("returns local keys in local order, then remote-only keys in remote order", () => {
    const result = pairByKeyInOrder(["b1", "a1"], ["c1", "a2", "c2"], keyOf);

    expect(result).toEqual([
      { kind: "localOnly", key: "b", index: 0, local: "b1" },
      { kind: "both", key: "a", index: 0, local: "a1", remote: "a2" },
      { kind: "remoteOnly", key: "c", index: 0, remote: "c1" },
      { kind: "remoteOnly", key: "c", index: 1, remote: "c2" },
    ]);
  });

  it("returns no pairs for empty inputs", () => {
    expect(pairByKeyInOrder([], [], keyOf)).toEqual([]);
  });
});
