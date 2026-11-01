import React from "react";
import { render, fireEvent, cleanup } from "@testing-library/react";
import ScreenBlock, { NotFound, ServerError } from "./ScreenBlock";

vi.mock("@blueprint/extends/Attribution", () => ({ default: () => null }));
vi.mock("@blueprint/components/Dashboard/Global/BeforeSection", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Dashboard/Global/AfterSection", () => ({
  default: () => null,
}));

describe("ScreenBlock components", () => {
  afterEach(cleanup);

  it("renders custom title, message, and image", () => {
    const { getByText, container } = render(
      <ScreenBlock
        title="Custom Failure"
        message="Detailed explanation of failure"
        image="/test-image.svg"
      />,
    );

    expect(getByText("Custom Failure")).toBeDefined();
    expect(getByText("Detailed explanation of failure")).toBeDefined();
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/test-image.svg");
  });

  it("renders onRetry action button and fires callback", () => {
    const onRetry = vi.fn();
    const { container } = render(
      <ScreenBlock
        title="Network Error"
        message="Cannot reach daemon"
        image="/test.svg"
        onRetry={onRetry}
      />,
    );

    const button = container.querySelector("button")!;
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders onBack action button and fires callback", () => {
    const onBack = vi.fn();
    const { container } = render(
      <ScreenBlock
        title="Not Found"
        message="Page does not exist"
        image="/test.svg"
        onBack={onBack}
      />,
    );

    const button = container.querySelector("button")!;
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("renders ServerError preset component", () => {
    const onRetry = vi.fn();
    const { getByText } = render(
      <ServerError message="Database connection refused" onRetry={onRetry} />,
    );

    expect(getByText("Something went wrong")).toBeDefined();
    expect(getByText("Database connection refused")).toBeDefined();
  });

  it("renders ServerError with custom title", () => {
    const { getByText } = render(
      <ServerError title="Custom Error Title" message="Something broke" />,
    );

    expect(getByText("Custom Error Title")).toBeDefined();
  });

  it("renders NotFound preset component", () => {
    const { getByText } = render(<NotFound />);

    expect(getByText("404")).toBeDefined();
    expect(getByText("The requested resource was not found.")).toBeDefined();
  });

  it("renders NotFound with custom title, message and onBack", () => {
    const onBack = vi.fn();
    const { getByText, container } = render(
      <NotFound
        title="Custom 404"
        message="Resource missing"
        onBack={onBack}
      />,
    );

    expect(getByText("Custom 404")).toBeDefined();
    expect(getByText("Resource missing")).toBeDefined();
    const button = container.querySelector("button")!;
    fireEvent.click(button);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
