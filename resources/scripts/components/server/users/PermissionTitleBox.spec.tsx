import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import PermissionTitleBox from "./PermissionTitleBox";

vi.mock("dequal", () => ({
  dequal: (a: any, b: any) => a === b,
}));

vi.mock("@/components/elements/TitledGreyBox", () => ({
  default: ({ title, children, className }: any) => (
    <div data-testid="titled-grey-box" className={className}>
      <header>{title}</header>
      <div>{children}</div>
    </div>
  ),
}));

const TestWrapper = ({
  defaultPermissions = [] as string[],
  isEditable = true,
  permissions = ["control.start", "control.stop"],
  title = "Server Controls",
  children = <div>Child Content</div>,
}: {
  defaultPermissions?: string[];
  isEditable?: boolean;
  permissions?: string[];
  title?: string;
  children?: React.ReactNode;
}) => {
  const methods = useForm({
    defaultValues: {
      permissions: defaultPermissions,
    },
  });

  return (
    <FormProvider {...methods}>
      <PermissionTitleBox
        isEditable={isEditable}
        title={title}
        permissions={permissions}
      >
        {children}
      </PermissionTitleBox>
    </FormProvider>
  );
};

describe("PermissionTitleBox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title, children and no checkbox when not editable", () => {
    render(<TestWrapper isEditable={false} title="Read-only permissions" />);

    expect(screen.getByText("Read-only permissions")).toBeDefined();
    expect(screen.getByText("Child Content")).toBeDefined();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("renders unchecked checkbox when none of permissions are present", () => {
    render(<TestWrapper defaultPermissions={["other.perm"]} />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDefined();
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
  });

  it("renders indeterminate checkbox when only some permissions are present", () => {
    render(<TestWrapper defaultPermissions={["control.start"]} />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDefined();
    expect(checkbox.getAttribute("aria-checked")).toBe("mixed");
  });

  it("renders checked checkbox when all permissions are present", () => {
    render(
      <TestWrapper defaultPermissions={["control.start", "control.stop"]} />,
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDefined();
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
  });

  it("checks all permissions on click when currently unchecked", () => {
    render(<TestWrapper defaultPermissions={[]} />);

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(checkbox.getAttribute("aria-checked")).toBe("true");
  });

  it("unchecks all permissions on click when currently checked", () => {
    render(
      <TestWrapper defaultPermissions={["control.start", "control.stop"]} />,
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(checkbox);
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
  });

  it("defaults to empty array when permissions form field is undefined", () => {
    const EmptyWrapper = () => {
      const methods = useForm();
      return (
        <FormProvider {...methods}>
          <PermissionTitleBox
            isEditable={true}
            title="Empty Permissions"
            permissions={["control.start"]}
          />
        </FormProvider>
      );
    };

    render(<EmptyWrapper />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
  });
});
