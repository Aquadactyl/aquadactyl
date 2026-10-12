import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ActivityLogMetaButton from "./ActivityLogMetaButton";

describe("components/elements/activity/ActivityLogMetaButton", () => {
  it("opens modal on click and displays formatted metadata, then closes", () => {
    const meta = { ip: "127.0.0.1", user_agent: "Mozilla/5.0" };
    render(<ActivityLogMetaButton meta={meta} />);

    const btn = screen.getByRole("button", { name: /view event details/i });
    expect(btn).toBeTruthy();

    fireEvent.click(btn);
    expect(screen.getByText("Event details")).toBeTruthy();
    expect(screen.getByText(/"ip": "127.0.0.1"/)).toBeTruthy();

    const closeBtn = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeBtn);

    // Reopen and close via Dialog onClose (Escape key)
    fireEvent.click(btn);
    expect(screen.getByText("Event details")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
  });
});
