import { describe, expect, it } from "vitest";
import type { RemoteResource, ResolvedResource } from "../../valueObject";
import { ResourceMerger } from "../resourceMerger";

describe("ResourceMerger", () => {
  describe("mergeResources", () => {
    it("現在のリソースが空の場合、受信リソースを追加する", () => {
      const current: RemoteResource[] = [];
      const incoming: ResolvedResource[] = [
        { type: "FILE", fileKey: "fk-1", name: "app.js" },
        { type: "URL", url: "https://cdn.example.com/lib.js" },
      ];

      const result = ResourceMerger.mergeResources(current, incoming);

      expect(result).toEqual([
        { type: "FILE", fileKey: "fk-1", name: "app.js" },
        { type: "URL", url: "https://cdn.example.com/lib.js" },
      ]);
    });

    it("受信リソースが空の場合、既存リソースを保持する", () => {
      const current: RemoteResource[] = [
        {
          type: "FILE",
          file: {
            fileKey: "fk-old",
            name: "existing.js",
            contentType: "application/javascript",
            size: "100",
          },
        },
        { type: "URL", url: "https://cdn.example.com/existing.js" },
      ];
      const incoming: ResolvedResource[] = [];

      const result = ResourceMerger.mergeResources(current, incoming);

      expect(result).toEqual([
        { type: "FILE", fileKey: "fk-old", name: "existing.js" },
        { type: "URL", url: "https://cdn.example.com/existing.js" },
      ]);
    });

    it("同名のFILEリソースを置換する", () => {
      const current: RemoteResource[] = [
        {
          type: "FILE",
          file: {
            fileKey: "fk-old",
            name: "app.js",
            contentType: "application/javascript",
            size: "100",
          },
        },
      ];
      const incoming: ResolvedResource[] = [
        { type: "FILE", fileKey: "fk-new", name: "app.js" },
      ];

      const result = ResourceMerger.mergeResources(current, incoming);

      expect(result).toEqual([
        { type: "FILE", fileKey: "fk-new", name: "app.js" },
      ]);
    });

    it("同一URLのURLリソースを置換する", () => {
      const current: RemoteResource[] = [
        { type: "URL", url: "https://cdn.example.com/lib.js" },
      ];
      const incoming: ResolvedResource[] = [
        { type: "URL", url: "https://cdn.example.com/lib.js" },
      ];

      const result = ResourceMerger.mergeResources(current, incoming);

      expect(result).toEqual([
        { type: "URL", url: "https://cdn.example.com/lib.js" },
      ]);
    });

    it("受信リソースに含まれない既存リソースを保持し、新規リソースを末尾に追加する", () => {
      const current: RemoteResource[] = [
        {
          type: "FILE",
          file: {
            fileKey: "fk-1",
            name: "existing.js",
            contentType: "application/javascript",
            size: "100",
          },
        },
        { type: "URL", url: "https://cdn.example.com/existing.js" },
      ];
      const incoming: ResolvedResource[] = [
        { type: "FILE", fileKey: "fk-new", name: "new.js" },
        { type: "URL", url: "https://cdn.example.com/new.js" },
      ];

      const result = ResourceMerger.mergeResources(current, incoming);

      expect(result).toEqual([
        { type: "FILE", fileKey: "fk-1", name: "existing.js" },
        { type: "URL", url: "https://cdn.example.com/existing.js" },
        { type: "FILE", fileKey: "fk-new", name: "new.js" },
        { type: "URL", url: "https://cdn.example.com/new.js" },
      ]);
    });

    it("更新と追加が混在するシナリオを処理する", () => {
      const current: RemoteResource[] = [
        {
          type: "FILE",
          file: {
            fileKey: "fk-old-1",
            name: "app.js",
            contentType: "application/javascript",
            size: "100",
          },
        },
        {
          type: "FILE",
          file: {
            fileKey: "fk-old-2",
            name: "vendor.js",
            contentType: "application/javascript",
            size: "200",
          },
        },
        { type: "URL", url: "https://cdn.example.com/lib.js" },
      ];
      const incoming: ResolvedResource[] = [
        { type: "FILE", fileKey: "fk-new-1", name: "app.js" },
        { type: "FILE", fileKey: "fk-new-3", name: "new.js" },
      ];

      const result = ResourceMerger.mergeResources(current, incoming);

      expect(result).toEqual([
        { type: "FILE", fileKey: "fk-old-2", name: "vendor.js" },
        { type: "URL", url: "https://cdn.example.com/lib.js" },
        { type: "FILE", fileKey: "fk-new-1", name: "app.js" },
        { type: "FILE", fileKey: "fk-new-3", name: "new.js" },
      ]);
    });
  });
});
