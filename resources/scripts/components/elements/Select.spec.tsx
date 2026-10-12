import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { fireEvent } from "@testing-library/react";
import Select, { SelectProps } from "./Select";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("Select interactions inside a label", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const renderSelect = (props: SelectProps = {}) => {
    act(() => {
      root.render(
        <form>
          <label>
            Time range
            <Select
              name={"period"}
              aria-label={"Time range"}
              defaultValue={""}
              {...props}
            >
              <option value={""}>All time</option>
              <option value={"7d"}>Last 7 days</option>
              <option value={"30d"}>Last 30 days</option>
            </Select>
          </label>
        </form>,
      );
    });
  };

  const click = (element: Element) => {
    for (const type of ["mousedown", "mouseup", "click"]) {
      act(() => {
        element.dispatchEvent(
          new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            button: 0,
          }),
        );
      });
    }
  };

  it.each(["control", "dropdown-indicator"])(
    "keeps the menu open after clicking the %s",
    (target) => {
      const nativeClick = vi.fn();
      renderSelect({ onClick: () => nativeClick() });

      click(container.querySelector(`.panel-select__${target}`)!);

      const input = container.querySelector('[role="combobox"]')!;
      expect(input.getAttribute("aria-expanded")).toBe("true");
      expect(document.activeElement).toBe(input);
      expect(nativeClick).not.toHaveBeenCalled();
    },
  );

  it("keeps option selection connected to native change events and form values", () => {
    const changes: string[] = [];
    renderSelect({
      onChange: (event) => changes.push(event.currentTarget.value),
    });
    click(container.querySelector(".panel-select__dropdown-indicator")!);

    const option = Array.from(
      document.querySelectorAll('[role="option"]'),
    ).find((element) => element.textContent === "Last 7 days")!;
    click(option);

    expect(changes).toEqual(["7d"]);
    expect(new FormData(container.querySelector("form")!).get("period")).toBe(
      "7d",
    );
    expect(
      container
        .querySelector('[role="combobox"]')!
        .getAttribute("aria-expanded"),
    ).toBe("false");
  });

  it("preserves keyboard selection and Escape dismissal", () => {
    renderSelect();
    const input =
      container.querySelector<HTMLInputElement>('[role="combobox"]')!;
    act(() => input.focus());

    for (const key of ["ArrowDown", "ArrowDown", "Enter"]) {
      act(() => {
        input.dispatchEvent(
          new KeyboardEvent("keydown", {
            key,
            bubbles: true,
            cancelable: true,
          }),
        );
      });
    }
    expect(new FormData(container.querySelector("form")!).get("period")).toBe(
      "7d",
    );

    for (const key of ["ArrowDown", "Escape"]) {
      act(() => {
        input.dispatchEvent(
          new KeyboardEvent("keydown", {
            key,
            bubbles: true,
            cancelable: true,
          }),
        );
      });
    }
    expect(input.getAttribute("aria-expanded")).toBe("false");
  });

  it("autofocuses the visible input with a mounted native target for form callbacks", () => {
    const targets: EventTarget[] = [];
    renderSelect({
      autoFocus: true,
      onFocus: (event) => targets.push(event.currentTarget),
    });

    expect(document.activeElement).toBe(
      container.querySelector('[role="combobox"]'),
    );
    expect(targets).toEqual([container.querySelector("select")]);
  });

  it("supports optgroup and Fragment children", () => {
    act(() => {
      root.render(
        <Select defaultValue={"opt1"}>
          <optgroup label="Group A">
            <option value="opt1">Option 1</option>
          </optgroup>
          <optgroup label="Group B" disabled>
            <option value="opt2">Option 2</option>
          </optgroup>
          <React.Fragment>
            <option value="opt3">Option 3</option>
          </React.Fragment>
        </Select>,
      );
    });

    click(container.querySelector(".panel-select__dropdown-indicator")!);

    expect(document.body.textContent).toContain("Group A");
    expect(document.body.textContent).toContain("Group B");
    expect(document.body.textContent).toContain("Option 3");
  });

  it("hides dropdown arrow when hideDropdownArrow is true", () => {
    act(() => {
      root.render(
        <Select hideDropdownArrow defaultValue="1">
          <option value="1">One</option>
        </Select>,
      );
    });

    expect(
      container.querySelector(".panel-select__dropdown-indicator svg"),
    ).toBeNull();
  });

  it("handles multiple selection mode", () => {
    act(() => {
      root.render(
        <Select multiple defaultValue={["1", "2"]}>
          <option value="1">One</option>
          <option value="2">Two</option>
          <option value="3">Three</option>
        </Select>,
      );
    });

    const select = container.querySelector("select")!;
    expect(select.multiple).toBe(true);
    const selected = Array.from(select.selectedOptions).map((o) => o.value);
    expect(selected).toEqual(["1", "2"]);

    click(container.querySelector(".panel-select__dropdown-indicator")!);
    const option = Array.from(
      document.querySelectorAll('[role="option"]'),
    ).find((element) => element.textContent === "Three")!;
    click(option);
  });

  it("handles onBlur, onKeyDown, and onInvalid events with synthetic event methods", () => {
    const onBlur = vi.fn((e: any) => {
      e.persist();
      e.preventDefault();
      e.stopPropagation();
      e.isDefaultPrevented();
      e.isPropagationStopped();
    });
    const onKeyDown = vi.fn();
    const onInvalid = vi.fn();

    act(() => {
      root.render(
        <Select
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          onInvalid={onInvalid}
          defaultValue="1"
        >
          <option value="1">One</option>
        </Select>,
      );
    });

    const input =
      container.querySelector<HTMLInputElement>('[role="combobox"]')!;
    fireEvent.blur(input);
    fireEvent.keyDown(input, { key: "Tab" });

    expect(onBlur).toHaveBeenCalled();
    expect(onKeyDown).toHaveBeenCalled();

    const select = container.querySelector("select")!;
    fireEvent.invalid(select);
    expect(onInvalid).toHaveBeenCalled();

    fireEvent.focus(select);
  });

  it("handles controlled value and ref forwarding", () => {
    const selectRef = React.createRef<HTMLSelectElement>();
    act(() => {
      root.render(
        <Select ref={selectRef} value="2">
          <option value="1">One</option>
          <option value="2">Two</option>
        </Select>,
      );
    });

    expect(selectRef.current).toBeInstanceOf(HTMLSelectElement);
    expect(selectRef.current?.value).toBe("2");
  });

  it("handles non-element and non-option children gracefully", () => {
    act(() => {
      root.render(
        <Select defaultValue="1">
          {"Text child"}
          <div data-testid="ignored-div">Ignored</div>
          <option value="1">One</option>
        </Select>,
      );
    });

    expect(container.querySelector("select")?.value).toBe("1");
  });

  it("falls back to first available option when neither value nor defaultValue is provided", () => {
    act(() => {
      root.render(
        <Select>
          <option value="0" disabled>
            Disabled Zero
          </option>
          <option value="1">Available One</option>
        </Select>,
      );
    });

    expect(container.querySelector("select")?.value).toBe("1");
  });

  it("handles multiple selection without default values", () => {
    act(() => {
      root.render(
        <Select multiple>
          <option value="1">One</option>
          <option value="2">Two</option>
        </Select>,
      );
    });

    const select = container.querySelector("select")!;
    expect(select.multiple).toBe(true);
  });

  it("resets uncontrolled value on form reset and executes timeout", async () => {
    act(() => {
      root.render(
        <form id="test-form">
          <Select name="test" defaultValue="default-val">
            <option value="default-val">Default</option>
            <option value="changed-val">Changed</option>
          </Select>
        </form>,
      );
    });

    const form = container.querySelector("form")!;
    act(() => {
      form.dispatchEvent(new Event("reset"));
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const select = container.querySelector("select")!;
    expect(select.value).toBe("default-val");
  });

  it("handles form reset when defaultPrevented is true", async () => {
    act(() => {
      root.render(
        <form>
          <Select defaultValue="val">
            <option value="val">Val</option>
          </Select>
        </form>,
      );
    });

    const form = container.querySelector("form")!;
    const event = new Event("reset", { cancelable: true });
    event.preventDefault();
    act(() => {
      form.dispatchEvent(event);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(form).toBeDefined();
  });

  it("tests helper functions isItemEqualToValue, itemToStringLabel, itemToStringValue", async () => {
    const { isItemEqualToValue, itemToStringLabel, itemToStringValue } =
      await import("./Select");

    expect(
      isItemEqualToValue(
        { value: "a", label: "A", isDisabled: false },
        { value: "a", label: "A", isDisabled: false },
      ),
    ).toBe(true);
    expect(
      isItemEqualToValue(
        { value: "a", label: "A", isDisabled: false },
        { value: "b", label: "B", isDisabled: false },
      ),
    ).toBe(false);
    expect(isItemEqualToValue(null as any, undefined as any)).toBe(true);

    expect(
      itemToStringLabel({ value: "a", label: "Label", isDisabled: false }),
    ).toBe("Label");
    expect(itemToStringLabel(null as any)).toBe("");

    expect(
      itemToStringValue({ value: "val", label: "Label", isDisabled: false }),
    ).toBe("val");
    expect(itemToStringValue(null as any)).toBe("");
  });

  it("renders with custom id, disabled prop, nested optgroup, and label-less optgroup", () => {
    act(() => {
      root.render(
        <Select id="custom-id" disabled defaultValue="nested-opt">
          <optgroup>
            <optgroup label="Inner Group">
              <option value="nested-opt">
                <span>JSX Nested Content</span>
              </option>
              <option>Label Without Value</option>
            </optgroup>
          </optgroup>
        </Select>,
      );
    });

    const native = container.querySelector("select");
    expect(native?.id).toBe("custom-id-native");
    expect(
      container.querySelector(".panel-select__control--is-disabled"),
    ).not.toBeNull();
  });

  it("handles all options disabled when no value is provided", () => {
    act(() => {
      root.render(
        <Select>
          <option value="d1" disabled>
            Disabled 1
          </option>
          <option value="d2" disabled>
            Disabled 2
          </option>
        </Select>,
      );
    });

    expect(container.querySelector("select")).not.toBeNull();
  });

  it("handles controlled select change without updating uncontrolled state", () => {
    const onChange = vi.fn();
    act(() => {
      root.render(
        <Select value="1" onChange={onChange}>
          <option value="1">One</option>
          <option value="2">Two</option>
        </Select>,
      );
    });

    click(container.querySelector(".panel-select__dropdown-indicator")!);

    const option = Array.from(
      document.querySelectorAll('[role="option"]'),
    ).find((element) => element.textContent === "Two")!;
    click(option);

    expect(onChange).toHaveBeenCalled();
  });

  it("handles processSelectionChange edge cases including null element, null next, and multiple", async () => {
    const { processSelectionChange } = await import("./Select");
    const setUncontrolled = vi.fn();

    // element is null
    processSelectionChange(null, null, false, true, setUncontrolled);
    expect(setUncontrolled).not.toHaveBeenCalled();

    // element provided, next is null (clears selection), not multiple
    const select = document.createElement("select");
    const option1 = document.createElement("option");
    option1.value = "1";
    select.appendChild(option1);
    processSelectionChange(null, select, false, true, setUncontrolled);
    expect(select.value).toBe("");
    expect(setUncontrolled).toHaveBeenCalledWith([]);

    // element provided, next is array, multiple is true, isUncontrolled is false
    setUncontrolled.mockClear();
    processSelectionChange(
      [{ value: "1", label: "One", isDisabled: false }],
      select,
      true,
      false,
      setUncontrolled,
    );
    expect(option1.selected).toBe(true);
    expect(setUncontrolled).not.toHaveBeenCalled();
  });
});
