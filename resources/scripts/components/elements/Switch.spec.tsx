import React, { createRef } from "react";
import { render, fireEvent, cleanup } from "@testing-library/react";
import Switch from "./Switch";

describe("Switch component", () => {
  afterEach(cleanup);

  it("renders with label and description", () => {
    const { getByText, getByRole } = render(
      <Switch
        name="email_notifications"
        label="Email Notifications"
        description="Receive emails on server state change."
      />,
    );

    expect(getByText("Email Notifications")).toBeDefined();
    expect(getByText("Receive emails on server state change.")).toBeDefined();

    const switchEl = getByRole("switch");
    expect(switchEl.getAttribute("aria-checked")).toBe("false");
  });

  it("toggles state and invokes both onCheckedChange and synthetic onChange", () => {
    const onCheckedChange = vi.fn();
    const onChange = vi.fn();

    const { getByRole } = render(
      <Switch
        name="two_factor"
        defaultChecked={false}
        onCheckedChange={onCheckedChange}
        onChange={onChange}
      />,
    );

    const switchEl = getByRole("switch");
    fireEvent.click(switchEl);

    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
    expect(onChange).toHaveBeenCalledTimes(1);

    const syntheticEvent = onChange.mock.calls[0][0];
    expect(syntheticEvent.target.name).toBe("two_factor");
    expect(syntheticEvent.target.checked).toBe(true);
    expect(syntheticEvent.target.type).toBe("checkbox");
  });

  it("respects checked and disabled props", () => {
    const onCheckedChange = vi.fn();

    const { getByRole } = render(
      <Switch
        name="locked_setting"
        checked={true}
        disabled={true}
        onCheckedChange={onCheckedChange}
      />,
    );

    const switchEl = getByRole("switch");
    expect(switchEl.getAttribute("aria-checked")).toBe("true");
    expect(switchEl.getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(switchEl);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("forwards ref to the internal input element", () => {
    const ref = createRef<HTMLInputElement>();

    render(<Switch name="with_ref" ref={ref} defaultChecked={true} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.checked).toBe(true);
  });

  it("renders custom children instead of default BaseSwitch.Root", () => {
    const { getByTestId, queryByRole } = render(
      <Switch name="custom_layout">
        <button data-testid="custom-trigger">Custom Toggle</button>
      </Switch>,
    );

    expect(getByTestId("custom-trigger")).toBeDefined();
    expect(queryByRole("switch")).toBeNull();
  });
});
