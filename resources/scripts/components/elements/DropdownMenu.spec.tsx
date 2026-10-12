import React, { createRef } from "react";
import { render, fireEvent, act, cleanup } from "@testing-library/react";
import DropdownMenu, {
  DropdownButtonRow,
  DropdownMenuRef,
} from "./DropdownMenu";

describe("DropdownMenu component", () => {
  afterEach(cleanup);

  it("renders trigger and opens menu on click", () => {
    const { getByText, queryByText } = render(
      <DropdownMenu
        renderToggle={(onClick) => <button onClick={onClick}>Options</button>}
      >
        <DropdownButtonRow>Item 1</DropdownButtonRow>
        <DropdownButtonRow danger>Delete</DropdownButtonRow>
      </DropdownMenu>,
    );

    const trigger = getByText("Options");
    expect(trigger).toBeDefined();

    // Menu content is not visible before click
    expect(queryByText("Item 1")).toBeNull();

    // Click trigger to open menu
    fireEvent.click(trigger);
    expect(getByText("Item 1")).toBeDefined();
    expect(getByText("Delete")).toBeDefined();
  });

  it("supports imperatively opening menu via ref", () => {
    const ref = createRef<DropdownMenuRef>();

    const { getByText, queryByText } = render(
      <DropdownMenu ref={ref} renderToggle={() => <span>Menu</span>}>
        <div>Ref Triggered Item</div>
      </DropdownMenu>,
    );

    expect(queryByText("Ref Triggered Item")).toBeNull();

    // Open via imperative ref
    act(() => {
      ref.current?.triggerMenu();
    });

    expect(getByText("Ref Triggered Item")).toBeDefined();
  });

  it("applies danger styling to DropdownButtonRow when danger prop is true", () => {
    const { getByText } = render(
      <DropdownButtonRow danger>Delete Server</DropdownButtonRow>,
    );

    const button = getByText("Delete Server");
    expect(button.className).toContain("hover:bg-red-900");
    expect(button.className).toContain("hover:text-red-200");
  });
});
