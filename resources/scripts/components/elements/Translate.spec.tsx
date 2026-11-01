import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Translate from "./Translate";

const mockT = vi.fn((key: string) => key);

vi.mock("react-i18next", () => ({
  useTranslation: (_ns: any) => ({
    t: mockT,
  }),
  Trans: ({ i18nKey, children }: any) => (
    <span data-testid="trans-component">{i18nKey || children}</span>
  ),
}));

describe("components/elements/Translate", () => {
  it("renders Trans component with given namespace and children", () => {
    render(
      <Translate ns="server" i18nKey="server.welcome">
        Default Welcome
      </Translate>,
    );

    expect(screen.getByTestId("trans-component")).toBeTruthy();
    expect(screen.getByText("server.welcome")).toBeTruthy();
  });
});
