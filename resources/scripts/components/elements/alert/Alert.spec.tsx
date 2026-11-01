import React from "react";
import { render, cleanup } from "@testing-library/react";
import Alert from "./Alert";
import { Alert as AlertFromIndex } from "./index";

describe("Alert component", () => {
  afterEach(cleanup);

  it("re-exports Alert from index.ts", () => {
    expect(AlertFromIndex).toBe(Alert);
  });

  it("renders warning alert with yellow styling", () => {
    const { getByText, container } = render(
      <Alert type="warning">This is a warning alert</Alert>,
    );

    expect(getByText("This is a warning alert")).toBeDefined();
    const alertDiv = container.firstChild as HTMLElement;
    expect(alertDiv.className).toContain("border-yellow-500");
    expect(alertDiv.className).toContain("bg-yellow-500/25");
  });

  it("renders danger alert with red styling", () => {
    const { getByText, container } = render(
      <Alert type="danger">This is a dangerous error</Alert>,
    );

    expect(getByText("This is a dangerous error")).toBeDefined();
    const alertDiv = container.firstChild as HTMLElement;
    expect(alertDiv.className).toContain("border-red-500");
    expect(alertDiv.className).toContain("bg-red-500/25");
  });

  it("merges custom className prop", () => {
    const { container } = render(
      <Alert type="warning" className="custom-test-class">
        Warning
      </Alert>,
    );

    const alertDiv = container.firstChild as HTMLElement;
    expect(alertDiv.className).toContain("custom-test-class");
  });
});
