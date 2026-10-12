import { describe, expect, it } from "vitest";
import { toActivityLogResult } from "./activity";

describe("api/activity", () => {
  it("transforms paginated response with availableEvents to ActivityLogResult", () => {
    const mockData = {
      object: "list",
      data: [
        {
          attributes: {
            id: "act-1",
            batch: null,
            event: "server:power.start",
            is_api: false,
            ip: "127.0.0.1",
            description: null,
            properties: {},
            has_additional_metadata: false,
            timestamp: "2026-01-01T00:00:00Z",
            relationships: {},
          },
        },
      ],
      meta: {
        pagination: {
          total: 1,
          count: 1,
          per_page: 25,
          current_page: 1,
          total_pages: 1,
        },
        available_events: ["server:power.start", "server:power.stop"],
      },
    };

    const result = toActivityLogResult(mockData as any);

    expect(result.items.length).toBe(1);
    expect(result.items[0].id).toBe("act-1");
    expect(result.items[0].event).toBe("server:power.start");
    expect(result.availableEvents).toEqual([
      "server:power.start",
      "server:power.stop",
    ]);
    expect(result.pagination.total).toBe(1);
  });

  it("defaults availableEvents to empty array if meta is empty", () => {
    const mockData = {
      object: "list",
      data: [],
      meta: {
        pagination: {
          total: 0,
          count: 0,
          per_page: 25,
          current_page: 1,
          total_pages: 1,
        },
      },
    };

    const result = toActivityLogResult(mockData as any);
    expect(result.items).toEqual([]);
    expect(result.availableEvents).toEqual([]);
  });
});
