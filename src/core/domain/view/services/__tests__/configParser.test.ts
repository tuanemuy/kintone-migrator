import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { ViewErrorCode } from "../../errorCode";
import { ViewConfigParser } from "../configParser";

describe("ViewConfigParser", () => {
  describe("LIST view", () => {
    it("should parse a basic LIST view", () => {
      const result = ViewConfigParser.parse({
        views: {
          一覧: {
            type: "LIST",
            index: 0,
            fields: ["field1", "field2"],
          },
        },
      });

      expect(result.views.一覧).toEqual({
        type: "LIST",
        index: 0,
        name: "一覧",
        fields: ["field1", "field2"],
      });
    });

    it("should parse a LIST view with filterCond and sort", () => {
      const result = ViewConfigParser.parse({
        views: {
          filtered: {
            type: "LIST",
            index: 1,
            fields: ["name"],
            filterCond: 'status = "active"',
            sort: "created_at desc",
          },
        },
      });

      expect(result.views.filtered.filterCond).toBe('status = "active"');
      expect(result.views.filtered.sort).toBe("created_at desc");
    });
  });

  describe("CALENDAR view", () => {
    it("should parse a CALENDAR view with date and title", () => {
      const result = ViewConfigParser.parse({
        views: {
          カレンダー: {
            type: "CALENDAR",
            index: 1,
            date: "date_field",
            title: "title_field",
          },
        },
      });

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
      const result = ViewConfigParser.parse({
        views: {
          custom: {
            type: "CUSTOM",
            index: 2,
            html: "<div>custom</div>",
            pager: true,
            device: "DESKTOP",
          },
        },
      });

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
      const result = ViewConfigParser.parse({
        views: {
          assignee: {
            type: "LIST",
            index: 0,
            builtinType: "ASSIGNEE",
          },
        },
      });
      expect(result.views.assignee.builtinType).toBe("ASSIGNEE");
    });

    it("should default index to 0 when not specified", () => {
      const result = ViewConfigParser.parse({
        views: {
          test: {
            type: "LIST",
          },
        },
      });
      expect(result.views.test.index).toBe(0);
    });

    it("should parse pager as boolean", () => {
      const result = ViewConfigParser.parse({
        views: {
          test: {
            type: "CUSTOM",
            index: 0,
            pager: false,
          },
        },
      });
      expect(result.views.test.pager).toBe(false);
    });

    it("should parse multiple views", () => {
      const result = ViewConfigParser.parse({
        views: {
          view1: { type: "LIST", index: 0 },
          view2: { type: "CALENDAR", index: 1 },
        },
      });
      expect(Object.keys(result.views)).toHaveLength(2);
      expect(result.views.view1.type).toBe("LIST");
      expect(result.views.view2.type).toBe("CALENDAR");
    });
  });

  describe("error cases", () => {
    it("should throw VwInvalidConfigStructure for non-object input", () => {
      expect(() => ViewConfigParser.parse("just a string")).toThrow(
        expect.objectContaining({
          code: ViewErrorCode.VwInvalidConfigStructure,
        }),
      );
    });

    it("should throw VwInvalidConfigStructure for array input", () => {
      expect(() => ViewConfigParser.parse(["item1"])).toThrow(
        expect.objectContaining({
          code: ViewErrorCode.VwInvalidConfigStructure,
        }),
      );
    });

    it("should throw VwInvalidConfigStructure for null input", () => {
      expect(() => ViewConfigParser.parse(null)).toThrow(
        expect.objectContaining({
          code: ViewErrorCode.VwInvalidConfigStructure,
        }),
      );
    });

    it("should throw VwInvalidConfigStructure for missing views key", () => {
      expect(() => ViewConfigParser.parse({ other: "value" })).toThrow(
        expect.objectContaining({
          code: ViewErrorCode.VwInvalidConfigStructure,
        }),
      );
    });

    it("should throw VwInvalidConfigStructure for views as array", () => {
      expect(() => ViewConfigParser.parse({ views: ["item"] })).toThrow(
        expect.objectContaining({
          code: ViewErrorCode.VwInvalidConfigStructure,
        }),
      );
    });

    it("should throw VwInvalidViewType for invalid view type", () => {
      expect(() =>
        ViewConfigParser.parse({
          views: {
            test: { type: "INVALID", index: 0 },
          },
        }),
      ).toThrow(
        expect.objectContaining({ code: ViewErrorCode.VwInvalidViewType }),
      );
    });

    it("should throw VwInvalidConfigStructure for view that is not an object", () => {
      expect(() =>
        ViewConfigParser.parse({
          views: {
            test: "not an object",
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ViewErrorCode.VwInvalidConfigStructure,
        }),
      );
    });

    it("should throw VwEmptyViewName for empty view name", () => {
      expect(() =>
        ViewConfigParser.parse({
          views: {
            "": { type: "LIST", index: 0 },
          },
        }),
      ).toThrow(
        expect.objectContaining({ code: ViewErrorCode.VwEmptyViewName }),
      );
    });

    it("should throw VwInvalidIndex for non-numeric index", () => {
      expect(() =>
        ViewConfigParser.parse({
          views: {
            test: { type: "LIST", index: "not_a_number" },
          },
        }),
      ).toThrow(
        expect.objectContaining({ code: ViewErrorCode.VwInvalidIndex }),
      );
    });
  });

  describe("device type", () => {
    it("should parse device: ANY", () => {
      const result = ViewConfigParser.parse({
        views: {
          custom: {
            type: "CUSTOM",
            index: 0,
            html: "<div>test</div>",
            device: "ANY",
          },
        },
      });
      expect(result.views.custom.device).toBe("ANY");
    });

    it("should parse device: DESKTOP", () => {
      const result = ViewConfigParser.parse({
        views: {
          custom: {
            type: "CUSTOM",
            index: 0,
            html: "<div>test</div>",
            device: "DESKTOP",
          },
        },
      });
      expect(result.views.custom.device).toBe("DESKTOP");
    });

    it("should throw for invalid device type", () => {
      expect(() =>
        ViewConfigParser.parse({
          views: {
            custom: {
              type: "CUSTOM",
              index: 0,
              device: "MOBILE",
            },
          },
        }),
      ).toThrow();
    });
  });

  describe("validation", () => {
    it("should throw for non-array fields", () => {
      expect(() =>
        ViewConfigParser.parse({
          views: {
            test: {
              type: "LIST",
              index: 0,
              fields: "not_an_array",
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for string pager", () => {
      expect(() =>
        ViewConfigParser.parse({
          views: {
            test: {
              type: "CUSTOM",
              index: 0,
              pager: "false",
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for negative index", () => {
      expect(() =>
        ViewConfigParser.parse({
          views: {
            test: {
              type: "LIST",
              index: -1,
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for fractional index", () => {
      expect(() =>
        ViewConfigParser.parse({
          views: {
            test: {
              type: "LIST",
              index: 1.5,
            },
          },
        }),
      ).toThrow(BusinessRuleError);
    });

    it("should throw for non-string field element", () => {
      expect(() =>
        ViewConfigParser.parse({
          views: {
            test: {
              type: "LIST",
              index: 0,
              fields: ["field1", 123],
            },
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: ViewErrorCode.VwInvalidConfigStructure,
        }),
      );
    });
  });
});
