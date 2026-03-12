import { describe, expect, it } from "vitest";
import type { ViewsConfig } from "../../entity";
import { ViewConfigParser } from "../configParser";
import { ViewConfigSerializer } from "../configSerializer";

describe("ViewConfigSerializer", () => {
  describe("LIST view", () => {
    it("should serialize a LIST view", () => {
      const config: ViewsConfig = {
        views: {
          一覧: {
            type: "LIST",
            index: 0,
            name: "一覧",
            fields: ["field1", "field2"],
          },
        },
      };

      const result = ViewConfigSerializer.serialize(config);
      const views = result.views as Record<string, Record<string, unknown>>;

      expect(views).toHaveProperty("一覧");
      expect(views.一覧.type).toBe("LIST");
      expect(views.一覧.fields).toEqual(["field1", "field2"]);
    });
  });

  describe("CALENDAR view", () => {
    it("should serialize a CALENDAR view", () => {
      const config: ViewsConfig = {
        views: {
          カレンダー: {
            type: "CALENDAR",
            index: 1,
            name: "カレンダー",
            date: "date_field",
            title: "title_field",
          },
        },
      };

      const result = ViewConfigSerializer.serialize(config);
      const views = result.views as Record<string, Record<string, unknown>>;

      expect(views.カレンダー.type).toBe("CALENDAR");
      expect(views.カレンダー.date).toBe("date_field");
      expect(views.カレンダー.title).toBe("title_field");
    });
  });

  describe("CUSTOM view", () => {
    it("should serialize a CUSTOM view with html and pager", () => {
      const config: ViewsConfig = {
        views: {
          custom: {
            type: "CUSTOM",
            index: 2,
            name: "custom",
            html: "<div>test</div>",
            pager: true,
            device: "DESKTOP",
          },
        },
      };

      const result = ViewConfigSerializer.serialize(config);
      const views = result.views as Record<string, Record<string, unknown>>;

      expect(views.custom.type).toBe("CUSTOM");
      expect(views.custom.html).toBe("<div>test</div>");
      expect(views.custom.pager).toBe(true);
      expect(views.custom.device).toBe("DESKTOP");
    });
  });

  describe("empty views", () => {
    it("should serialize empty views config", () => {
      const config: ViewsConfig = { views: {} };
      const result = ViewConfigSerializer.serialize(config);
      expect(result).toHaveProperty("views");
    });
  });

  describe("optional fields", () => {
    it("should include builtinType when present", () => {
      const config: ViewsConfig = {
        views: {
          assignee: {
            type: "LIST",
            index: 0,
            name: "assignee",
            builtinType: "ASSIGNEE",
          },
        },
      };

      const result = ViewConfigSerializer.serialize(config);
      const views = result.views as Record<string, Record<string, unknown>>;

      expect(views.assignee.builtinType).toBe("ASSIGNEE");
    });

    it("should include filterCond and sort when present", () => {
      const config: ViewsConfig = {
        views: {
          test: {
            type: "LIST",
            index: 0,
            name: "test",
            filterCond: 'status = "active"',
            sort: "created_at desc",
          },
        },
      };

      const result = ViewConfigSerializer.serialize(config);
      const views = result.views as Record<string, Record<string, unknown>>;

      expect(views.test).toHaveProperty("filterCond");
      expect(views.test).toHaveProperty("sort");
    });
  });

  describe("round-trip", () => {
    it("should produce parseable output (parse -> serialize -> parse)", () => {
      const original: ViewsConfig = {
        views: {
          一覧: {
            type: "LIST",
            index: 0,
            name: "一覧",
            fields: ["field1", "field2"],
            filterCond: 'status = "active"',
            sort: "created_at desc",
          },
          カレンダー: {
            type: "CALENDAR",
            index: 1,
            name: "カレンダー",
            date: "date_field",
            title: "title_field",
          },
        },
      };

      const serialized = ViewConfigSerializer.serialize(original);
      const parsed = ViewConfigParser.parse(serialized);

      expect(parsed.views.一覧.type).toBe("LIST");
      expect(parsed.views.一覧.fields).toEqual(["field1", "field2"]);
      expect(parsed.views.一覧.filterCond).toBe('status = "active"');
      expect(parsed.views.カレンダー.type).toBe("CALENDAR");
      expect(parsed.views.カレンダー.date).toBe("date_field");
    });

    it("should round-trip CUSTOM view with html", () => {
      const original: ViewsConfig = {
        views: {
          custom: {
            type: "CUSTOM",
            index: 0,
            name: "custom",
            html: "<div>test</div>",
            pager: true,
          },
        },
      };

      const serialized = ViewConfigSerializer.serialize(original);
      const parsed = ViewConfigParser.parse(serialized);

      expect(parsed.views.custom.type).toBe("CUSTOM");
      expect(parsed.views.custom.html).toBe("<div>test</div>");
      expect(parsed.views.custom.pager).toBe(true);
    });
  });
});
