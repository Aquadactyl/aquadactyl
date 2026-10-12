import React from "react";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { Dialog } from "./index";

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

  it("renders with Dialog.Icon and Dialog.Footer", () => {
    const { getByText, container } = render(
      <Dialog open={true} title="Action Needed" onClose={vi.fn()}>
        <Dialog.Icon type="danger" position="title" />
        <p>Important Notice</p>
        <Dialog.Footer>
          <button>Dismiss</button>
        </Dialog.Footer>
      </Dialog>,
    );

    expect(getByText("Action Needed")).toBeDefined();
    expect(getByText("Important Notice")).toBeDefined();
    expect(getByText("Dismiss")).toBeDefined();

    const iconDiv = container.querySelector(".dialog_icon.danger");
    expect(iconDiv).toBeDefined();
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
