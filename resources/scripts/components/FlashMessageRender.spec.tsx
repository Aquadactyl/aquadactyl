import React from "react";
import { render } from "@testing-library/react";
import FlashMessageRender from "./FlashMessageRender";

it("preserves the legacy component API without duplicating globally rendered toast messages", () => {
  const { container, rerender } = render(<FlashMessageRender />);
  expect(container.firstChild).toBeNull();
  rerender(<FlashMessageRender byKey="account" className="legacy-class" />);
  expect(container.firstChild).toBeNull();
});
