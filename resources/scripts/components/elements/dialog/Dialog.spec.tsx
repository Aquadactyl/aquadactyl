import React from "react";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { Dialog } from "./index";
import { describe, expect, it, vi, afterEach } from "vitest";

describe("Dialog component family", () => {
  afterEach(cleanup);

  it("renders open dialog with title, description, and children", () => {
    const onClose = vi.fn();

    const { getByText } = render(
      <Dialog
        open={true}
        title="Test Modal Title"
        description="Detailed description text"
        onClose={onClose}
      >
        <p>Dialog Body Content</p>
      </Dialog>,
    );

    expect(getByText("Test Modal Title")).toBeDefined();
    expect(getByText("Detailed description text")).toBeDefined();
    expect(getByText("Dialog Body Content")).toBeDefined();
  });

  it("calls onClose when close icon button is clicked", () => {
    const onClose = vi.fn();

    render(
      <Dialog open={true} title="Closable Dialog" onClose={onClose}>
        <p>Content</p>
      </Dialog>,
    );

    const closeBtn = document.body
      .querySelector(".dialog_close_icon")
      ?.closest("button");
    expect(closeBtn).not.toBeNull();
    fireEvent.click(closeBtn!);
    expect(onClose).toHaveBeenCalled();
  });

  it("hides close icon when hideCloseIcon is true", () => {
    render(
      <Dialog open={true} title="No Close Icon" hideCloseIcon onClose={vi.fn()}>
        <p>Content</p>
      </Dialog>,
    );

    expect(document.body.querySelector(".dialog_close_icon")).toBeNull();
  });

  it("renders with Dialog.Icon positioned in container and Dialog.Footer", () => {
    const { getByText } = render(
      <Dialog open={true} title="Action Needed" onClose={vi.fn()}>
        <Dialog.Icon type="danger" position="container" />
        <p>Important Notice</p>
        <Dialog.Footer>
          <button>Dismiss</button>
        </Dialog.Footer>
      </Dialog>,
    );

    expect(getByText("Action Needed")).toBeDefined();
    expect(getByText("Important Notice")).toBeDefined();
    expect(getByText("Dismiss")).toBeDefined();

    const iconDiv = document.body.querySelector(".dialog_icon.danger");
    expect(iconDiv).not.toBeNull();
  });

  it("handles mouse down and up on dialog container backdrop", () => {
    render(
      <Dialog open={true} onClose={vi.fn()}>
        <p>Backdrop Click Test</p>
      </Dialog>,
    );

    const dialogContainer = document.body.querySelector(".dialog_container");
    expect(dialogContainer).not.toBeNull();

    fireEvent.mouseDown(dialogContainer!);
    fireEvent.mouseUp(dialogContainer!);
  });

  it("renders Dialog.Confirm with Cancel and Confirm buttons", () => {
    const onClose = vi.fn();
    const onConfirmed = vi.fn();

    const { getByText } = render(
      <Dialog.Confirm
        open={true}
        title="Delete Server"
        confirm="Confirm Delete"
        onClose={onClose}
        onConfirmed={onConfirmed}
      >
        Are you sure you want to delete this server?
      </Dialog.Confirm>,
    );

    expect(getByText("Delete Server")).toBeDefined();
    expect(
      getByText("Are you sure you want to delete this server?"),
    ).toBeDefined();

    const cancelButton = getByText("Cancel");
    const confirmButton = getByText("Confirm Delete");

    fireEvent.click(cancelButton);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(confirmButton);
    expect(onConfirmed).toHaveBeenCalledTimes(1);
  });
});
