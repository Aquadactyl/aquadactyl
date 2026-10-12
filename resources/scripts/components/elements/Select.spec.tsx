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
  });

  it("handles onBlur, onKeyDown, and onInvalid events", () => {
    const onBlur = vi.fn();
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
  });

  it("handles controlled value", () => {
    act(() => {
      root.render(
        <Select value="2">
          <option value="1">One</option>
          <option value="2">Two</option>
        </Select>,
      );
    });

    const select = container.querySelector("select")!;
    expect(select.value).toBe("2");
  });

  it("resets uncontrolled value on form reset", async () => {
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

    const select = container.querySelector("select")!;
    expect(select.value).toBe("default-val");
  });
});
