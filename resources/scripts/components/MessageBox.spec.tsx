import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MessageBox from "./MessageBox";

describe("components/MessageBox", () => {
  it.each([
    ["error", "bg-red-600", "bg-red-500"],
    ["info", "bg-primary-600", "bg-primary-500"],
    ["success", "bg-green-600", "bg-green-500"],
    ["warning", "bg-yellow-600", "bg-yellow-500"],
  ] as const)(
    "renders with %s styling and title",
    (type, expectedBorder, expectedBg) => {
      const { container } = render(
        <MessageBox type={type} title={`${type} title`}>
          Message content
        </MessageBox>,
      );

      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText("Message content")).toBeDefined();
      expect(screen.getByText(`${type} title`)).toBeDefined();
      expect(container.firstChild).toHaveProperty("className");
      expect((container.firstChild as HTMLElement).className).toContain(
        expectedBorder,
      );
      expect(screen.getByText(`${type} title`).className).toContain(expectedBg);
    },
  );

  it("renders with default styling when type is undefined and without title", () => {
    const { container } = render(
      <MessageBox>Plain message without title</MessageBox>,
    );

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText("Plain message without title")).toBeDefined();
    expect(container.querySelector(".title")).toBeNull();
  });

  it("renders with default background when type is undefined and with title", () => {
    render(<MessageBox title="Notice">Message with notice</MessageBox>);

    expect(screen.getByText("Notice")).toBeDefined();
    expect(screen.getByText("Notice").className).not.toContain("bg-red-500");
  });
});
