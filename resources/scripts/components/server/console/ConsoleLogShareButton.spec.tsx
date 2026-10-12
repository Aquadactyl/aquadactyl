import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import ConsoleLogShareButton from "./ConsoleLogShareButton";
import shareConsoleLogs from "@/api/server/shareConsoleLogs";

const settings = vi.hoisted(() => ({ enabled: false }));
vi.mock("@/state", () => ({
  useAppStore: (select: (state: unknown) => unknown) =>
    select({
      settings: { data: { features: { consoleLogSharing: settings.enabled } } },
      user: { data: {} },
    }),
}));
vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (select: (state: unknown) => unknown) =>
      select({ server: { data: { id: "serv_test" } } }),
  },
}));
vi.mock("@/api/server/shareConsoleLogs", () => ({ default: vi.fn() }));
vi.mock("motion/react", () => ({
  motion: {
    div: ({
      initial: _initial,
      animate: _animate,
      exit: _exit,
      variants: _variants,
      ...props
    }: Record<string, unknown>) => <div {...props} />,
  },
}));

afterEach(() => {
  cleanup();
  settings.enabled = false;
  vi.resetAllMocks();
});

it("hides the button and never reads or uploads logs when disabled", () => {
  const getLogs = vi.fn();
  render(<ConsoleLogShareButton getLogs={getLogs} />);
  expect(
    screen.queryByRole("button", { name: "Share redacted console logs" }),
  ).toBeNull();
  expect(getLogs).not.toHaveBeenCalled();
  expect(shareConsoleLogs).not.toHaveBeenCalled();
});

it("uploads once and displays the returned link with a copy control", async () => {
  settings.enabled = true;
  let finish!: (url: string) => void;
  vi.mocked(shareConsoleLogs).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const getLogs = vi.fn(() => "Server ready");
  render(<ConsoleLogShareButton getLogs={getLogs} />);
  const button = screen.getByRole("button", {
    name: "Share redacted console logs",
  });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(shareConsoleLogs).toHaveBeenCalledExactlyOnceWith(
    "serv_test",
    "Server ready",
  );
  expect(button.getAttribute("disabled")).not.toBeNull();
  await act(async () => {
    finish("https://debug.euphoriadevelopment.uk/paste/test-log");
  });
  expect(screen.getByRole("link").getAttribute("href")).toBe(
    "https://debug.euphoriadevelopment.uk/paste/test-log",
  );
  expect(screen.getByRole("button", { name: "Copy link" })).toBeDefined();
});

it("reports empty logs without making an upload", async () => {
  settings.enabled = true;
  render(<ConsoleLogShareButton getLogs={() => "  "} />);
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: "Share redacted console logs" }),
    );
  });
  expect(screen.getByRole("alert").textContent).toContain("no console logs");
  expect(shareConsoleLogs).not.toHaveBeenCalled();
});

it("shows a safe error and allows retry when the upload fails", async () => {
  settings.enabled = true;
  vi.mocked(shareConsoleLogs).mockRejectedValue(
    new Error("sensitive upstream body"),
  );
  render(<ConsoleLogShareButton getLogs={() => "Test logs"} />);
  const button = screen.getByRole("button", {
    name: "Share redacted console logs",
  });
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: "Share redacted console logs" }),
    );
  });
  expect(screen.getByRole("alert").textContent).toContain(
    "Unable to share console logs",
  );
  expect(document.body.textContent).not.toContain("sensitive upstream");
  expect(button.getAttribute("disabled")).toBeNull();
});
