import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { appStore } from "@/state";
import ToastHost from "./ToastHost";
import FlashMessageRender from "@/components/FlashMessageRender";

vi.mock("@/plugins/usePanelTranslation", () => ({
  default: () => ({ t: (_: string, fallback: string) => fallback }),
}));

beforeEach(() => {
  vi.useFakeTimers();
  appStore
    .getState()
    .flashes.toasts.forEach((toast) =>
      appStore.getState().flashes.dismissToast(toast.id!),
    );
  appStore.getState().flashes.clearFlashes();
});
afterEach(() => vi.useRealTimers());

it("shows keyed legacy flashes once as safe toasts and preserves them when a route clears its banners", () => {
  render(
    <>
      <ToastHost />
      <FlashMessageRender byKey="account" />
    </>,
  );
  act(() =>
    appStore.getState().flashes.addFlash({
      key: "account",
      type: "success",
      title: "Saved",
      message: '<img src=x onerror="alert(1)">',
    }),
  );
  expect(screen.getAllByText("Saved")).toHaveLength(1);
  expect(document.querySelector(".panel-toast img")).toBeNull();
  act(() => appStore.getState().flashes.clearFlashes("account"));
  expect(screen.getByText('<img src=x onerror="alert(1)">')).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
  expect(document.querySelector(".panel-toast")).toBeNull();
});

it("expires success and information messages, pauses during interaction, and keeps errors until dismissed", async () => {
  render(<ToastHost />);
  act(() => {
    appStore
      .getState()
      .flashes.addFlash({ type: "info", message: "Background task completed" });
    appStore
      .getState()
      .flashes.addError({ message: "Please check your password" });
  });
  const toast = screen
    .getByText("Background task completed")
    .closest(".panel-toast")!;
  fireEvent.mouseEnter(toast);
  await act(async () => vi.advanceTimersByTimeAsync(9000));
  expect(screen.getByText("Background task completed")).toBeDefined();
  fireEvent.mouseLeave(toast);
  fireEvent.focus(toast);
  await act(async () => vi.advanceTimersByTimeAsync(9000));
  expect(screen.getByText("Background task completed")).toBeDefined();
  fireEvent.blur(toast);
  await act(async () => vi.advanceTimersByTimeAsync(7000));
  expect(screen.queryByText("Background task completed")).toBeNull();
  expect(screen.getByRole("alert").textContent).toContain(
    "Please check your password",
  );
});

it("bounds the toast stack and supports warning and HTTP error notifications", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  render(<ToastHost />);
  act(() => {
    for (let index = 0; index < 7; index++)
      appStore
        .getState()
        .flashes.addFlash({ type: "warning", message: `Warning ${index}` });
    appStore
      .getState()
      .flashes.clearAndAddHttpError({ error: new Error("Connection lost") });
  });
  expect(document.querySelectorAll(".panel-toast")).toHaveLength(5);
  expect(screen.queryByText("Warning 0")).toBeNull();
  expect(screen.getByText("Connection lost")).toBeDefined();
  spy.mockRestore();
});
