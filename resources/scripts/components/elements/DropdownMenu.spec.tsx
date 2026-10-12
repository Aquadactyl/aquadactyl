import React, { createRef } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Menu } from "@base-ui/react/menu";
import DropdownMenu, { DropdownMenuRef } from "./DropdownMenu";

afterEach(cleanup);

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

it("keeps a context menu open when it is requested again", async () => {
  const ref = createRef<DropdownMenuRef>();
  render(
    <DropdownMenu
      ref={ref}
      renderToggle={(onClick) => (
        <button onClick={onClick}>File actions</button>
      )}
    >
      <Menu.Item>Rename</Menu.Item>
    </DropdownMenu>,
  );
  act(() => ref.current?.triggerMenu());
  await screen.findByRole("menu");
  act(() => ref.current?.triggerMenu());
  expect(screen.getByRole("menu")).toBeDefined();
});
