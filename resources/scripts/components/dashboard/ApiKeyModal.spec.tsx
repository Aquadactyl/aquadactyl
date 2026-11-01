import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ApiKeyModal from "./ApiKeyModal";
import ModalContext from "@/context/ModalContext";

vi.mock("@/hoc/asModal", () => ({
  default: () => (Component: any) => (props: any) => <Component {...props} />,
}));

vi.mock("@/components/elements/CopyOnClick", () => ({
  default: ({ children }: any) => (
    <div data-testid="copy-wrapper">{children}</div>
  ),
}));

vi.mock("@/components/elements/SensitiveValue", () => ({
  default: ({ children }: any) => <span>{children}</span>,
}));

describe("components/dashboard/ApiKeyModal", () => {
  it("renders API key details and handles dismiss button click", () => {
    const dismiss = vi.fn();

    render(
      <ModalContext.Provider value={{ dismiss } as any}>
        <ApiKeyModal visible apiKey="ptlc_secret_api_key_123" />
      </ModalContext.Provider>,
    );

    expect(screen.getByText("Your API Key")).toBeTruthy();
    expect(screen.getByText("ptlc_secret_api_key_123")).toBeTruthy();

    const closeBtn = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeBtn);
    expect(dismiss).toHaveBeenCalled();
  });
});
