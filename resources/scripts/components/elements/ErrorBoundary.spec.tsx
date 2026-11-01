import React, { useState } from "react";
import { render, fireEvent, cleanup } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

const BuggyComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Simulated component error");
  }
  return <div>Component loaded normally</div>;
};

describe("ErrorBoundary component", () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    cleanup();
  });

  it("renders children normally when no error occurs", () => {
    const { getByText } = render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(getByText("Component loaded normally")).toBeDefined();
  });

  it("renders default fallback UI and reports error when child throws", () => {
    const onError = vi.fn();

    const { getByText } = render(
      <ErrorBoundary onError={onError}>
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(
      getByText(/An error was encountered by the application/),
    ).toBeDefined();
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });

  it("renders custom function fallback with reset capability", () => {
    const onReset = vi.fn();

    const Wrapper = () => {
      const [shouldThrow, setShouldThrow] = useState(true);

      return (
        <ErrorBoundary
          onReset={() => {
            onReset();
            setShouldThrow(false);
          }}
          fallback={({ error, resetErrorBoundary }) => (
            <div>
              <p>Failed with: {error?.message}</p>
              <button onClick={resetErrorBoundary}>Try Again</button>
            </div>
          )}
        >
          <BuggyComponent shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    };

    const { getByText } = render(<Wrapper />);

    expect(getByText("Failed with: Simulated component error")).toBeDefined();

    // Click retry
    fireEvent.click(getByText("Try Again"));

    expect(onReset).toHaveBeenCalled();
    expect(getByText("Component loaded normally")).toBeDefined();
  });

  it("renders custom ReactNode fallback directly", () => {
    const { getByText } = render(
      <ErrorBoundary fallback={<div>Custom Static Fallback</div>}>
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(getByText("Custom Static Fallback")).toBeDefined();
  });
});
