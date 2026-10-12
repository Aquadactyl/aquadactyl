import { describe, expect, it } from "vitest";
import {
  getPaginationSet,
  httpErrorToHuman,
  withQueryBuilderParams,
} from "./http";

describe("api/http", () => {
  describe("httpErrorToHuman", () => {
    it("returns error message when no response object is present", () => {
      const error = new Error("Network Error");
      expect(httpErrorToHuman(error)).toBe("Network Error");
    });

    it("extracts error detail from response data errors array", () => {
      const error = {
        message: "Failed",
        response: {
          data: {
            errors: [{ detail: "Invalid credentials provided." }],
          },
        },
      };
      expect(httpErrorToHuman(error)).toBe("Invalid credentials provided.");
    });

    it("parses stringified JSON error in response data", () => {
      const error = {
        message: "Failed",
        response: {
          data: JSON.stringify({
            errors: [{ detail: "Session expired." }],
          }),
        },
      };
      expect(httpErrorToHuman(error)).toBe("Session expired.");
    });

    it("handles unparseable string error safely and falls back", () => {
      const error = {
        message: "Fallback message",
        response: {
          data: "<html>502 Bad Gateway</html>",
        },
      };
      expect(httpErrorToHuman(error)).toBe("Fallback message");
    });

    it("extracts wings string error property", () => {
      const error = {
        message: "Failed",
        response: {
          data: {
            error: "File is too large for upload.",
          },
        },
      };
      expect(httpErrorToHuman(error)).toBe("File is too large for upload.");
    });
  });

  describe("getPaginationSet", () => {
    it("maps raw fractal pagination object to PaginationDataSet", () => {
      const raw = {
        total: 100,
        count: 25,
        per_page: 25,
        current_page: 2,
        total_pages: 4,
      };

      expect(getPaginationSet(raw)).toEqual({
        total: 100,
        count: 25,
        perPage: 25,
        currentPage: 2,
        totalPages: 4,
      });
    });
  });

  describe("withQueryBuilderParams", () => {
    it("returns empty object when no data is provided", () => {
      expect(withQueryBuilderParams()).toEqual({});
    });

    it("formats filters correctly, excluding empty values", () => {
      const result = withQueryBuilderParams({
        filters: {
          name: "minecraft",
          empty: "",
          nullish: null,
          active: true,
          count: 10,
        },
      });

      expect(result).toEqual({
        "filter[name]": "minecraft",
        "filter[active]": true,
        "filter[count]": 10,
        page: undefined,
        sort: undefined,
      });
    });

    it("formats sorts correctly with asc and desc", () => {
      const result = withQueryBuilderParams({
        sorts: {
          name: "asc",
          created_at: "desc",
          updated_at: -1,
          id: 1,
          ignored: 0,
        },
      });

      expect(result.sort).toBe("name,-created_at,-updated_at,id");
    });

    it("includes page parameter when specified", () => {
      const result = withQueryBuilderParams({
        page: 3,
        filters: { tag: "prod" },
      });

      expect(result.page).toBe(3);
      expect(result["filter[tag]"]).toBe("prod");
    });
  });
});
