import { expect, it, vi } from "vitest";
import http from "@/api/http";
import getFileImage from "./getFileImage";
import getFileContents from "./getFileContents";

vi.mock("@/api/http", () => ({ default: { get: vi.fn() } }));

it("forwards cancellation when reading a large text file", async () => {
  const signal = new AbortController().signal;
  vi.mocked(http.get).mockResolvedValue({ data: "complete contents" });
  expect(await getFileContents("server", "/large.log", signal)).toBe(
    "complete contents",
  );
  expect(http.get).toHaveBeenCalledWith(
    "/api/client/servers/server/files/contents",
    expect.objectContaining({ signal, responseType: "text" }),
  );
});

it("fetches binary image bytes through the permission-checked contents endpoint", async () => {
  const blob = new Blob([new Uint8Array([0, 255, 128, 10])]);
  const controller = new AbortController();
  vi.mocked(http.get).mockResolvedValue({ data: blob });
  expect(
    await getFileImage(
      "server",
      "/pictures/space #& photo.png",
      controller.signal,
    ),
  ).toBe(blob);
  expect(http.get).toHaveBeenCalledWith(
    "/api/client/servers/server/files/contents",
    {
      params: { file: "/pictures/space #& photo.png" },
      responseType: "blob",
      signal: controller.signal,
    },
  );
});
