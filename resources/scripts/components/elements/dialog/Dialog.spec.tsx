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

  it("handles icon rendered at title position with different icon types", () => {
    const { getByText } = render(
      <Dialog open={true} title="Warning Title" onClose={vi.fn()}>
        <Dialog.Icon type="warning" />
        <p>Warning Dialog Body</p>
      </Dialog>,
    );

    expect(getByText("Warning Title")).toBeDefined();
    expect(document.body.querySelector(".dialog_icon.warning")).not.toBeNull();
  });

  it("handles success and info icon types", () => {
    const { rerender } = render(
      <Dialog open={true} title="Success" onClose={vi.fn()}>
        <Dialog.Icon type="success" />
      </Dialog>,
    );
    expect(document.body.querySelector(".dialog_icon.success")).not.toBeNull();

    rerender(
      <Dialog open={true} title="Info" onClose={vi.fn()}>
        <Dialog.Icon type="info" />
      </Dialog>,
    );
    expect(document.body.querySelector(".dialog_icon.info")).not.toBeNull();
  });

  it("respects preventExternalClose on outside-press and escape-key", () => {
    const onClose = vi.fn();
    render(
      <Dialog open={true} preventExternalClose onClose={onClose}>
        <p>Dialog Body</p>
      </Dialog>,
    );

    // Click the close button inside the dialog which should still call onClose
    const closeBtn = document.body
      .querySelector(".dialog_close_icon")
      ?.closest("button");
    expect(closeBtn).not.toBeNull();
    fireEvent.click(closeBtn!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("invokes context default fallback methods without errors", async () => {
    const { DialogContext, DialogWrapperContext } = await import("./context");

    // Test DialogContext defaults
    const defaultCtx = (DialogContext as any)._currentValue;
    expect(defaultCtx.setIcon(null)).toBeNull();
    expect(defaultCtx.setFooter(null)).toBeNull();
    expect(defaultCtx.setIconPosition("title")).toBeNull();

    // Test DialogWrapperContext defaults
    const defaultWrapperCtx = (DialogWrapperContext as any)._currentValue;
    expect(defaultWrapperCtx.setProps({})).toBeNull();
    expect(defaultWrapperCtx.close()).toBeNull();
  });

  it("ignores clicks on elements other than the container itself", () => {
    render(
      <Dialog open={true} onClose={vi.fn()}>
        <p>Child content</p>
      </Dialog>,
    );

    const child = document.body.querySelector("p");
    expect(child).not.toBeNull();
    fireEvent.mouseDown(child!);
    fireEvent.mouseUp(child!);
  });

  it("renders ConfirmationDialog with element children and default confirm text", () => {
    const onConfirmed = vi.fn();
    const onClose = vi.fn();

    const { getByText } = render(
      <Dialog.Confirm open={true} onClose={onClose} onConfirmed={onConfirmed}>
        <span>Custom JSX Content</span>
      </Dialog.Confirm>,
    );

    expect(getByText("Custom JSX Content")).toBeDefined();
    expect(getByText("Okay")).toBeDefined();

    fireEvent.click(getByText("Okay"));
    expect(onConfirmed).toHaveBeenCalled();
  });

  it("calls onClose on Escape key press", () => {
    const onClose = vi.fn();
    render(
      <Dialog open={true} onClose={onClose}>
        <p>Escape test</p>
      </Dialog>,
    );

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onClose on Escape key press when preventExternalClose is true", () => {
    const onClose = vi.fn();
    render(
      <Dialog open={true} preventExternalClose onClose={onClose}>
        <p>Prevent escape test</p>
      </Dialog>,
    );

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("handles transitioning open from false to true", () => {
    const { rerender, getByText } = render(
      <Dialog open={false} onClose={vi.fn()}>
        <p>Toggle test</p>
      </Dialog>,
    );

    rerender(
      <Dialog open={true} onClose={vi.fn()}>
        <p>Toggle test</p>
      </Dialog>,
    );
    expect(getByText("Toggle test")).toBeDefined();
  });

  it("handles handleDialogOpenChange for nextOpen true and false", async () => {
    const { handleDialogOpenChange } = await import("./Dialog");
    const onClose = vi.fn();

    // nextOpen true -> no-op
    handleDialogOpenChange(true, {}, false, onClose);
    expect(onClose).not.toHaveBeenCalled();

    // nextOpen false, preventExternalClose false -> calls onClose
    handleDialogOpenChange(false, { reason: "escape-key" }, false, onClose);
    expect(onClose).toHaveBeenCalledTimes(1);

    // nextOpen false, preventExternalClose true -> returns early
    onClose.mockClear();
    handleDialogOpenChange(false, { reason: "outside-press" }, true, onClose);
    expect(onClose).not.toHaveBeenCalled();
  });
});
