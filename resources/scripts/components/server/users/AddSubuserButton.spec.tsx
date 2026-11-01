import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import AddSubuserButton from "@/components/server/users/AddSubuserButton";

vi.mock("@/components/server/users/EditSubuserModal", () => ({
  default: ({
    visible,
    onModalDismissed,
  }: {
    visible: boolean;
    onModalDismissed: () => void;
  }) =>
    visible ? (
      <div data-testid={"edit-subuser-modal"}>
        Modal Open
        <button data-testid={"dismiss-modal"} onClick={onModalDismissed}>
          Dismiss
        </button>
      </div>
    ) : null,
}));

describe("AddSubuserButton", () => {
  it("renders New User button and toggles modal on click", () => {
    render(<AddSubuserButton />);

    const button = screen.getByRole("button", { name: "New User" });
    expect(button).toBeDefined();
    expect(screen.queryByTestId("edit-subuser-modal")).toBeNull();

    fireEvent.click(button);

    expect(screen.getByTestId("edit-subuser-modal")).toBeDefined();

    fireEvent.click(screen.getByTestId("dismiss-modal"));
    expect(screen.queryByTestId("edit-subuser-modal")).toBeNull();
  });
});
