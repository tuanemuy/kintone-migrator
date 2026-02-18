import { describe, expect, it } from "vitest";
import { isBusinessRuleError } from "@/core/domain/error";
import { ViewConfigParser } from "../configParser";

describe("ViewConfigParser", () => {
  describe("LIST view", () => {
    it("should parse a basic LIST view", () => {
      const yaml = `
views:
  一覧:
    type: LIST
    index: 0
    fields:
      - field1
      - field2
`;
      const result = ViewConfigParser.parse(yaml);

      expect(result.views.一覧).toEqual({
        type: "LIST",
        index: 0,
        name: "一覧",
        fields: ["field1", "field2"],
      });
    });

    it("should parse a LIST view with filterCond and sort", () => {
      const yaml = `
views:
  filtered:
    type: LIST
    index: 1
    fields:
      - name
    filterCond: status = "active"
    sort: created_at desc
`;
      const result = ViewConfigParser.parse(yaml);

      expect(result.views.filtered.filterCond).toBe('status = "active"');
      expect(result.views.filtered.sort).toBe("created_at desc");
    });
  });

  describe("CALENDAR view", () => {
    it("should parse a CALENDAR view with date and title", () => {
      const yaml = `
views:
  カレンダー:
    type: CALENDAR
    index: 1
    date: date_field
    title: title_field
`;
      const result = ViewConfigParser.parse(yaml);

      expect(result.views.カレンダー).toEqual({
        type: "CALENDAR",
        index: 1,
        name: "カレンダー",
        date: "date_field",
        title: "title_field",
      });
    });
  });

  describe("CUSTOM view", () => {
    it("should parse a CUSTOM view with html and pager", () => {
      const yaml = `
views:
  custom:
    type: CUSTOM
    index: 2
    html: "<div>custom</div>"
    pager: true
    device: DESKTOP
`;
      const result = ViewConfigParser.parse(yaml);

      expect(result.views.custom).toEqual({
        type: "CUSTOM",
        index: 2,
        name: "custom",
        html: "<div>custom</div>",
        pager: true,
        device: "DESKTOP",
      });
    });
  });

  describe("optional fields", () => {
    it("should parse builtinType when present", () => {
      const yaml = `
views:
  assignee:
    type: LIST
    index: 0
    builtinType: ASSIGNEE
`;
      const result = ViewConfigParser.parse(yaml);
      expect(result.views.assignee.builtinType).toBe("ASSIGNEE");
    });

    it("should default index to 0 when not specified", () => {
      const yaml = `
views:
  test:
    type: LIST
`;
      const result = ViewConfigParser.parse(yaml);
      expect(result.views.test.index).toBe(0);
    });

    it("should parse pager as boolean", () => {
      const yaml = `
views:
  test:
    type: CUSTOM
    index: 0
    pager: false
`;
      const result = ViewConfigParser.parse(yaml);
      expect(result.views.test.pager).toBe(false);
    });

    it("should parse multiple views", () => {
      const yaml = `
views:
  view1:
    type: LIST
    index: 0
  view2:
    type: CALENDAR
    index: 1
`;
      const result = ViewConfigParser.parse(yaml);
      expect(Object.keys(result.views)).toHaveLength(2);
      expect(result.views.view1.type).toBe("LIST");
      expect(result.views.view2.type).toBe("CALENDAR");
    });
  });

  describe("error cases", () => {
    it("should throw for empty text", () => {
      expect(() => ViewConfigParser.parse("")).toThrow();
      expect(() => ViewConfigParser.parse("  ")).toThrow();
    });

    it("should throw BusinessRuleError for empty text", () => {
      expect.assertions(1);
      try {
        ViewConfigParser.parse("");
      } catch (error) {
        expect(isBusinessRuleError(error)).toBe(true);
      }
    });

    it("should throw for invalid YAML", () => {
      expect(() => ViewConfigParser.parse("{ invalid: yaml:")).toThrow();
    });

    it("should throw for non-object config", () => {
      expect(() => ViewConfigParser.parse("just a string")).toThrow();
    });

    it("should throw for missing views key", () => {
      expect(() => ViewConfigParser.parse("other: value")).toThrow();
    });

    it("should throw for views as array", () => {
      expect(() => ViewConfigParser.parse("views:\n  - item")).toThrow();
    });

    it("should throw for invalid view type", () => {
      const yaml = `
views:
  test:
    type: INVALID
    index: 0
`;
      expect(() => ViewConfigParser.parse(yaml)).toThrow();
    });

    it("should throw for view that is not an object", () => {
      const yaml = `
views:
  test: "not an object"
`;
      expect(() => ViewConfigParser.parse(yaml)).toThrow();
    });

    it("should throw for empty view name", () => {
      const yaml = `
views:
  "":
    type: LIST
    index: 0
`;
      expect(() => ViewConfigParser.parse(yaml)).toThrow();
    });
  });
});
