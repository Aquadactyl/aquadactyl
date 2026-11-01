import { describe, expect, it } from "vitest";
import http, {
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

  describe("interceptors", () => {
    it("handles request interceptor logic", () => {
      const reqHandlers = (http.interceptors.request as any).handlers;
      const handler = reqHandlers[0];

      // Request not ending with /resources
      const req1 = { url: "/api/client" };
      expect(handler.fulfilled(req1)).toBe(req1);

      // Request ending with /resources
      const req2 = { url: "/api/client/servers/123/resources" };
      expect(handler.fulfilled(req2)).toBe(req2);

      // Request with undefined url
      const req3 = {};
      expect(handler.fulfilled(req3)).toBe(req3);
    });

    it("handles response interceptor fulfilled and rejected", () => {
      const respHandlers = (http.interceptors.response as any).handlers;
      const handler = respHandlers[0];

      // Response not ending with /resources
      const resp1 = { request: { url: "/api/client" } };
      expect(handler.fulfilled(resp1)).toBe(resp1);

      // Response ending with /resources
      const resp2 = { request: { url: "/api/client/servers/123/resources" } };
      expect(handler.fulfilled(resp2)).toBe(resp2);

      // Response with undefined request or url
      const resp3 = { request: {} };
      expect(handler.fulfilled(resp3)).toBe(resp3);

      // Response error handler
      const err = new Error("Request failed");
      expect(() => handler.rejected(err)).toThrow("Request failed");
    });
  });
});
