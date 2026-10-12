import React from "react";
import { render, fireEvent, cleanup, screen } from "@testing-library/react";
import Modal, { ModalMask } from "./Modal";
import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("@/components/elements/Fade", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/elements/Spinner", () => ({
  default: () => <div data-testid="spinner">Spinner</div>,
}));

describe("Modal", () => {
  afterEach(cleanup);

  it("renders visible modal with children and close button", () => {
    const onDismissed = vi.fn();
    render(
      <Modal visible={true} onDismissed={onDismissed}>
        <p>Modal Body Content</p>
      </Modal>,
    );

    expect(screen.getByText("Modal Body Content")).toBeDefined();
    const closeBtn = document.body.querySelector(".close-icon");
    expect(closeBtn).not.toBeNull();

    fireEvent.click(closeBtn!);
    expect(onDismissed).toHaveBeenCalled();
  });

  it("hides close button when dismissable is false", () => {
    render(
      <Modal visible={true} dismissable={false} onDismissed={vi.fn()}>
        <p>Non-dismissable modal</p>
      </Modal>,
    );

    expect(document.body.querySelector(".close-icon")).toBeNull();
  });

  it("renders spinner overlay when showSpinnerOverlay is true", () => {
    render(
      <Modal visible={true} showSpinnerOverlay={true} onDismissed={vi.fn()}>
        <p>Processing Modal</p>
      </Modal>,
    );

    expect(screen.getByTestId("spinner")).toBeDefined();
    expect(document.body.querySelector(".close-icon")).toBeNull();
  });

  it("renders with top=false without top margin", () => {
    render(
      <Modal visible={true} top={false} onDismissed={vi.fn()}>
        <p>Centered modal</p>
      </Modal>,
    );

    expect(screen.getByText("Centered modal")).toBeDefined();
  });

  it("renders ModalMask component", () => {
    const { container } = render(<ModalMask className="custom-mask" />);
    expect(container.querySelector(".custom-mask")).not.toBeNull();
  });
});
