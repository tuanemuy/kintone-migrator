import { describe, expect, it } from "vitest";
import { describeFilterCondKey, filterCondKey } from "../filterCondKey";

describe("filterCondKey", () => {
  it("appends the index after the filterCond", () => {
    expect(filterCondKey('status = "A"', 1)).toBe('status = "A"#1');
  });

  it("keys an empty filterCond by the index alone", () => {
    expect(filterCondKey("", 0)).toBe("#0");
  });
});

describe("describeFilterCondKey", () => {
  it("quotes the filterCond and keeps the index outside the quotes", () => {
    expect(describeFilterCondKey(filterCondKey('status = "A"', 1))).toBe(
      '"status = \\"A\\""#1',
    );
  });

  it("escapes a newline and keeps a ']' inside the quotes", () => {
    expect(describeFilterCondKey(filterCondKey("a ]: b\nc", 0))).toBe(
      '"a ]: b\\nc"#0',
    );
  });

  it("splits at the last '#' when the filterCond contains '#'", () => {
    expect(describeFilterCondKey(filterCondKey("x#1", 2))).toBe('"x#1"#2');
  });

  it("shows an empty filterCond as an empty quoted string", () => {
    expect(describeFilterCondKey(filterCondKey("", 0))).toBe('""#0');
  });

  it("keeps a multi-digit index whole", () => {
    expect(describeFilterCondKey(filterCondKey("x = 1", 12))).toBe(
      '"x = 1"#12',
    );
  });
});
