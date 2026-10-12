import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, mutateGlobal, useTanStackQuery } from "./queryClient";

describe("lib/queryClient", () => {
  beforeEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("mutateGlobal", () => {
    it("sets data directly when data is provided", async () => {
      await mutateGlobal(["test-key"], { name: "test-data" });

      const cached = queryClient.getQueryData(["test-key"]);
      expect(cached).toEqual({ name: "test-data" });
    });

    it("invalidates queries when data is undefined", async () => {
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      await mutateGlobal(["test-key"]);

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["test-key"] });
    });
  });

  describe("useTanStackQuery", () => {
    it("fetches data successfully using queryFn", async () => {
      const queryFn = vi.fn().mockResolvedValue("fetched result");

      const { result } = renderHook(
        () => useTanStackQuery(["my-key"], queryFn),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.data).toBe("fetched result");
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("supports mutate with static data and updater function", async () => {
      const queryFn = vi.fn().mockResolvedValue(10);

      const { result } = renderHook(
        () => useTanStackQuery(["counter"], queryFn),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.data).toBe(10);
      });

      // Mutate with direct value
      let mutatedVal: any;
      await act(async () => {
        mutatedVal = await result.current.mutate(20, false);
      });
      expect(mutatedVal).toBe(20);
      await waitFor(() => {
        expect(result.current.data).toBe(20);
      });

      // Mutate with updater function
      await act(async () => {
        mutatedVal = await result.current.mutate(
          (prev: any) => prev + 5,
          false,
        );
      });
      expect(mutatedVal).toBe(25);
      await waitFor(() => {
        expect(result.current.data).toBe(25);
      });

      // Mutate with revalidate
      await act(async () => {
        await result.current.mutate();
      });
    });

    it("respects enabled option and null queryKey", async () => {
      const queryFn = vi.fn().mockResolvedValue("disabled");

      const { result } = renderHook(
        () => useTanStackQuery(null, queryFn, { enabled: false }),
        { wrapper },
      );

      expect(result.current.data).toBeUndefined();
      expect(queryFn).not.toHaveBeenCalled();

      // Mutate returns undefined when queryKey is null
      const res = await result.current.mutate("val");
      expect(res).toBeUndefined();
    });
  });
});
