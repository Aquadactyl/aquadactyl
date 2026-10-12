import React from "react";
import { render, cleanup, waitFor } from "@testing-library/react";
import Features from "./Features";

vi.mock("@feature/eula/EulaModalFeature", () => ({
  default: () => <div data-testid="feature-eula">Eula Feature</div>,
}));
vi.mock("@feature/java_version", () => ({
  default: () => <div data-testid="feature-java">Java Feature</div>,
}));
vi.mock("@feature/pid_limit", () => ({
  default: () => <div data-testid="feature-pid">PID Feature</div>,
}));

describe("Features server component container", () => {
  afterEach(cleanup);

  it("dynamically renders matching enabled features", async () => {
    const { getByTestId, queryByTestId } = render(
      <Features enabled={["eula"]} />,
    );

    await waitFor(() => {
      expect(getByTestId("feature-eula")).toBeDefined();
    });

    expect(queryByTestId("feature-pid")).toBeNull();
  });

  it("handles empty enabled array gracefully without rendering any features", () => {
    const { container } = render(<Features enabled={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("matches feature names case-insensitively", async () => {
    const { getByTestId } = render(<Features enabled={["EULA"]} />);

    await waitFor(() => {
      expect(getByTestId("feature-eula")).toBeDefined();
    });
  });
});
