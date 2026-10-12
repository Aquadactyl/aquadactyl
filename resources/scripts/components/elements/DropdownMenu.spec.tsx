import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Menu } from "@base-ui/react/menu";
import DropdownMenu, { DropdownButtonRow } from "./DropdownMenu";

afterEach(cleanup);

describe("DropdownMenu component", () => {
  it("keeps the menu open through mouse-down and click, then closes on selection", async () => {
    const select = vi.fn();
    render(
      <DropdownMenu
        renderToggle={(onClick) => (
          <button onClick={onClick}>File actions</button>
        )}
      >
        <Menu.Item onClick={select}>Rename</Menu.Item>
      </DropdownMenu>,
    );
    const trigger = screen.getByRole("button", { name: "File actions" });
    fireEvent.pointerDown(trigger, {
      pointerType: "mouse",
      button: 0,
      width: 1,
      height: 1,
    });
    fireEvent.mouseDown(trigger, { button: 0 });
    await screen.findByRole("menu");
    fireEvent.pointerUp(trigger, { pointerType: "mouse", button: 0 });
    fireEvent.mouseUp(trigger, { button: 0 });
    fireEvent.click(trigger, { button: 0, detail: 1 });
    expect(screen.getByRole("menu")).toBeDefined();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
    expect(select).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("applies danger styling to DropdownButtonRow when danger prop is true", () => {
    const { getByText } = render(
      <DropdownButtonRow danger>Delete Server</DropdownButtonRow>,
    );

    const button = getByText("Delete Server");
    expect(button.className).toContain("hover:bg-red-900");
    expect(button.className).toContain("hover:text-red-200");
  });

  it("closes menu when clicking an item inside the popup", async () => {
    const { getByText } = render(
      <DropdownMenu
        renderToggle={(onClick) => <button onClick={onClick}>Actions</button>}
      >
        <div data-testid="item-to-click">Clickable Action</div>
      </DropdownMenu>,
    );

    // Open menu
    fireEvent.click(getByText("Actions"));
    expect(getByText("Clickable Action")).toBeDefined();

    // Click item inside popup
    const popupChild = getByText("Clickable Action").parentElement!;
    await act(async () => {
      fireEvent.click(popupChild);
    });
  });

  it("triggers trigger container onClick with triggerProps", () => {
    const { getByTestId, queryByText } = render(
      <DropdownMenu
        renderToggle={() => <span data-testid="custom-toggle">Custom</span>}
      >
        <div>Content</div>
      </DropdownMenu>,
    );

    const toggle = getByTestId("custom-toggle");
    const container = toggle.parentElement!;

    // Clicking the container div
    fireEvent.click(container);
    expect(queryByText("Content")).toBeDefined();
  });
});
