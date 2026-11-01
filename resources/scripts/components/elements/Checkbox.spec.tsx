import React from "react";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import Checkbox from "./Checkbox";

describe("Checkbox component", () => {
  afterEach(cleanup);

  const FormValuesDisplay = ({ control }: { control: any }) => {
    const permissions = (useWatch({ control, name: "permissions" }) ||
      []) as string[];
    return <span data-testid="selected-values">{permissions.join(",")}</span>;
  };

  const TestForm = ({
    initialValues = [] as string[],
    disabled = false,
  }: {
    initialValues?: string[];
    disabled?: boolean;
  }) => {
    const methods = useForm({
      defaultValues: {
        permissions: initialValues,
      },
    });

    return (
      <FormProvider {...methods}>
        <form>
          <label htmlFor="perm-read">Read Permission</label>
          <Checkbox
            id="perm-read"
            name="permissions"
            value="read"
            disabled={disabled}
            data-testid="checkbox-read"
          />

          <label htmlFor="perm-write">Write Permission</label>
          <Checkbox
            id="perm-write"
            name="permissions"
            value="write"
            disabled={disabled}
            data-testid="checkbox-write"
          />

          <FormValuesDisplay control={methods.control} />
        </form>
      </FormProvider>
    );
  };

  it("renders with unchecked and checked states based on form values", () => {
    const { getByTestId } = render(<TestForm initialValues={["read"]} />);

    const readCheckbox = getByTestId("checkbox-read");
    const writeCheckbox = getByTestId("checkbox-write");

    expect(readCheckbox.getAttribute("aria-checked")).toBe("true");
    expect(writeCheckbox.getAttribute("aria-checked")).toBe("false");
  });

  it("updates form values when clicked to check and uncheck", () => {
    const { getByTestId } = render(<TestForm initialValues={["read"]} />);

    const writeCheckbox = getByTestId("checkbox-write");
    const readCheckbox = getByTestId("checkbox-read");
    const display = getByTestId("selected-values");

    expect(display.textContent).toBe("read");

    // Check write
    fireEvent.click(writeCheckbox);
    expect(writeCheckbox.getAttribute("aria-checked")).toBe("true");
    expect(display.textContent).toContain("write");
    expect(display.textContent).toContain("read");

    // Uncheck read
    fireEvent.click(readCheckbox);
    expect(readCheckbox.getAttribute("aria-checked")).toBe("false");
    expect(display.textContent).toBe("write");
  });

  it("disables the checkbox when disabled prop is provided", () => {
    const { getByTestId } = render(<TestForm disabled={true} />);

    const readCheckbox = getByTestId("checkbox-read");
    expect(readCheckbox.getAttribute("aria-disabled")).toBe("true");
  });

  it("safely renders outside of FormProvider without crashing", () => {
    const { getByTestId } = render(
      <Checkbox
        name="standalone"
        value="standalone_val"
        id="standalone"
        data-testid="checkbox-standalone"
      />,
    );

    const checkbox = getByTestId("checkbox-standalone");
    expect(checkbox).toBeDefined();
    expect(checkbox.getAttribute("aria-checked")).toBe("false");

    // Clicking when no form context is available should safely do nothing
    fireEvent.click(checkbox);
  });

  it("handles undefined form values and non-array form values gracefully", () => {
    const NonArrayTestForm = () => {
      const methods = useForm({
        defaultValues: {
          testField: undefined,
        },
      });

      return (
        <FormProvider {...methods}>
          <Checkbox
            name="testField"
            value="option1"
            data-testid="checkbox-undefined"
          />
          <button
            type="button"
            data-testid="set-non-array"
            onClick={() => methods.setValue("testField", "string-value" as any)}
          >
            Set Non Array
          </button>
        </FormProvider>
      );
    };

    const { getByTestId } = render(<NonArrayTestForm />);
    const cb = getByTestId("checkbox-undefined");
    expect(cb.getAttribute("aria-checked")).toBe("false");

    // Click when undefined
    fireEvent.click(cb);
    expect(cb.getAttribute("aria-checked")).toBe("true");

    // Set non-array and click to trigger fallback branch
    fireEvent.click(getByTestId("set-non-array"));
    fireEvent.click(cb);
  });
});
