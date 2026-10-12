import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import PermissionRow from "@/components/server/users/PermissionRow";
import { store } from "@/state";

describe("PermissionRow", () => {
  beforeEach(() => {
    store.getActions().permissions.setPermissions({
      control: {
        description: "Server control permissions",
        keys: {
          start: "Allows starting the server.",
          stop: "Allows stopping the server.",
        },
      },
    } as any);
  });

  it("renders permission name, description, and enabled checkbox", () => {
    render(<PermissionRow permission={"control.start"} disabled={false} />);

    expect(screen.getByText("start")).toBeDefined();
    expect(screen.getByText("Allows starting the server.")).toBeDefined();

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.hasAttribute("disabled")).toBe(false);
  });

  it("renders disabled checkbox and container style when disabled is true", () => {
    const { container } = render(
      <PermissionRow permission={"control.stop"} disabled={true} />,
    );

    expect(screen.getByText("stop")).toBeDefined();
    expect(screen.getByText("Allows stopping the server.")).toBeDefined();

    const label = container.querySelector("label");
    expect(label?.className).toContain("disabled");

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.getAttribute("aria-disabled")).toBe("true");
  });
});
