import { describe, expect, it } from "vitest";
import { toPaginatedSet, transform } from "./helpers";
import {
  FractalPaginatedResponse,
  FractalResponseData,
  FractalResponseList,
} from "@/api/http";

describe("api/definitions/helpers", () => {
  const dummyTransformer = (data: FractalResponseData) => ({
    transformedId: data.attributes.id,
    name: data.attributes.name,
  });

  describe("transform", () => {
    it("returns missing value when data is null or undefined", () => {
      expect(transform(null, dummyTransformer, "fallback")).toBe("fallback");
      expect(transform(undefined, dummyTransformer, null)).toBeNull();
      expect(transform(undefined, dummyTransformer)).toBeUndefined();
    });

    it("returns missing value for null_resource or missing attributes", () => {
      const nullResource = {
        object: "null_resource",
        attributes: {},
      } as any;
      expect(transform(nullResource, dummyTransformer, "missing")).toBe(
        "missing",
      );

      const invalidData = {
        object: "server",
      } as any;
      expect(transform(invalidData, dummyTransformer, "missing")).toBe(
        "missing",
      );
    });

    it("transforms single FractalResponseData", () => {
      const item: FractalResponseData = {
        object: "item",
        attributes: { id: 1, name: "Alpha" },
      };

      const result = transform(item, dummyTransformer);
      expect(result).toEqual({ transformedId: 1, name: "Alpha" });
    });

    it("transforms FractalResponseList items", () => {
      const list: FractalResponseList = {
        object: "list",
        data: [
          { object: "item", attributes: { id: 1, name: "Alpha" } },
          { object: "item", attributes: { id: 2, name: "Beta" } },
        ],
      };

      const result = transform(list, dummyTransformer);
      expect(result).toEqual([
        { transformedId: 1, name: "Alpha" },
        { transformedId: 2, name: "Beta" },
      ]);
    });
  });

  describe("toPaginatedSet", () => {
    it("transforms paginated response into items and pagination structure", () => {
      const paginated: FractalPaginatedResponse = {
        object: "list",
        data: [{ object: "item", attributes: { id: 10, name: "Ten" } }],
        meta: {
          pagination: {
            total: 100,
            count: 1,
            per_page: 10,
            current_page: 1,
            total_pages: 10,
          },
        },
      };

      const result = toPaginatedSet(paginated, dummyTransformer as any);
      expect(result.items).toEqual([{ transformedId: 10, name: "Ten" }]);
      expect(result.pagination).toEqual({
        total: 100,
        count: 1,
        perPage: 10,
        currentPage: 1,
        totalPages: 10,
      });
    });
  });
});
