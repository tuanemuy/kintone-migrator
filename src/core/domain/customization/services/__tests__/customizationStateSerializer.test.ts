import { describe, expect, it } from "vitest";
import type { CustomizationConfig } from "../../entity";
import type { ContentDigest } from "../../valueObject";
import { CustomizationStateParser } from "../customizationStateParser";
import { CustomizationStateSerializer } from "../customizationStateSerializer";

const A_DIGEST: ContentDigest =
  "sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";
const B_DIGEST: ContentDigest =
  "sha256:486ea46224d1bb4fb680f34f7c9ad96a8f24ec88be73ea8e5a6c65260e9cb8a7";

describe("CustomizationStateSerializer", () => {
  it("round-trips the config and the digest map", () => {
    const config: CustomizationConfig = {
      scope: "ALL",
      desktop: {
        js: [{ type: "FILE", path: "app/desktop/js/a.js" }],
        css: [],
      },
      mobile: { js: [{ type: "FILE", path: "app/mobile/js/b.js" }], css: [] },
    };
    const fileDigests = new Map<string, ContentDigest>([
      ["desktop:js:a.js", A_DIGEST],
      ["mobile:js:b.js", B_DIGEST],
    ]);

    const serialized = CustomizationStateSerializer.serialize({
      config,
      fileDigests,
    });
    const parsed = CustomizationStateParser.parse(serialized);

    expect(parsed.config).toEqual(config);
    expect(parsed.fileDigests).toEqual(fileDigests);
  });

  it("attaches each digest to the right entry when buckets and platforms are empty", () => {
    // desktop.css and the whole mobile platform are omitted by the serializer,
    // so an implementation that walked the output positionally would misalign.
    const config: CustomizationConfig = {
      scope: "ALL",
      desktop: {
        js: [
          { type: "FILE", path: "a.js" },
          { type: "URL", url: "https://cdn.example.com/lib.js" },
          { type: "FILE", path: "b.js" },
        ],
        css: [],
      },
      mobile: { js: [], css: [] },
    };
    const fileDigests = new Map<string, ContentDigest>([
      ["desktop:js:b.js", B_DIGEST],
    ]);

    const serialized = CustomizationStateSerializer.serialize({
      config,
      fileDigests,
    });

    expect(serialized).not.toHaveProperty("mobile");
    const desktop = serialized.desktop as { js: Record<string, unknown>[] };
    expect(desktop).not.toHaveProperty("css");
    expect(desktop.js[0]).toEqual({ type: "FILE", path: "a.js" });
    expect(desktop.js[2]).toEqual({
      type: "FILE",
      path: "b.js",
      digest: B_DIGEST,
    });
  });

  it("never writes a digest on a URL resource", () => {
    const serialized = CustomizationStateSerializer.serialize({
      config: {
        scope: "ALL",
        desktop: {
          js: [{ type: "URL", url: "https://cdn.example.com/lib.js" }],
          css: [],
        },
        mobile: { js: [], css: [] },
      },
      // A stray digest under the URL's own key must not leak into the output.
      fileDigests: new Map<string, ContentDigest>([
        ["desktop:js:https://cdn.example.com/lib.js", A_DIGEST],
      ]),
    });

    const desktop = serialized.desktop as { js: Record<string, unknown>[] };
    expect(desktop.js[0]).toEqual({
      type: "URL",
      url: "https://cdn.example.com/lib.js",
    });
  });

  it("omits the digest key for untracked FILE entries", () => {
    const serialized = CustomizationStateSerializer.serialize({
      config: {
        scope: "ALL",
        desktop: { js: [{ type: "FILE", path: "a.js" }], css: [] },
        mobile: { js: [], css: [] },
      },
      fileDigests: new Map(),
    });

    const desktop = serialized.desktop as { js: Record<string, unknown>[] };
    expect(desktop.js[0]).toEqual({ type: "FILE", path: "a.js" });
  });
});
