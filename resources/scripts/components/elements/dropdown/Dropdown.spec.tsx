import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Dropdown from "./Dropdown";
import { Dropdown as DropdownFromIndex } from "./index";

describe("components/elements/dropdown", () => {
  it("re-exports Dropdown from index", () => {
    expect(DropdownFromIndex).toBe(Dropdown);
  });
  it("throws an error when rendered without Dropdown.Button", () => {
    expect(() => {
      render(
        <Dropdown>
          <Dropdown.Item>Item 1</Dropdown.Item>
        </Dropdown>,
      );
    }).toThrow(
      "Cannot mount <Dropdown /> component without a child <Dropdown.Button />.",
    );
  });

  it("renders dropdown with button, gap, and item", () => {
    const onClick = vi.fn();
    const { container } = render(
      <Dropdown>
        <Dropdown.Button animate={false}>Options</Dropdown.Button>
        <Dropdown.Gap />
        <Dropdown.Gap invisible />
        <Dropdown.Item onClick={onClick} danger>
          Delete
        </Dropdown.Item>
        <Dropdown.Item disabled icon={<span data-testid="icon">Icon</span>}>
          {({ active, disabled }) => (
            <span>{`State: ${active ? "active" : "inactive"} ${disabled ? "disabled" : "enabled"}`}</span>
          )}
        </Dropdown.Item>
      </Dropdown>,
    );

    expect(screen.getByText("Options")).toBeTruthy();
    expect(container.querySelector(".dropdown-menu")).toBeTruthy();

    const trigger = screen.getByText("Options").closest("button");
    if (trigger) {
      fireEvent.click(trigger);
    }
  });

  it("renders Dropdown.Button with non-string custom children and custom className", () => {
    render(
      <Dropdown>
        <Dropdown.Button className="custom-btn">
          <span data-testid="custom-trigger">Trigger Element</span>
        </Dropdown.Button>
        <Dropdown.Item>Action</Dropdown.Item>
      </Dropdown>,
    );

    expect(screen.getByTestId("custom-trigger")).toBeTruthy();
  });
});
