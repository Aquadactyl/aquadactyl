import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import ActivityLogFilters from "./ActivityLogFilters";

describe("components/elements/activity/ActivityLogFilters", () => {
  const mockEvents = [
    "server:power.start",
    "server:power.stop",
    "server:file.upload",
    "user:password.change",
  ];

  it("renders event select and IP filter inputs", () => {
    const onChange = vi.fn();
    const onClear = vi.fn();

    render(
      <ActivityLogFilters
        events={mockEvents}
        hash={{}}
        hasFilters={false}
        onChange={onChange}
        onClear={onClear}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Event type" })).toBeDefined();
    expect(screen.getByLabelText("IP address")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
  });

  it("shows Clear filters button when hasFilters is true and calls onClear", () => {
    const onChange = vi.fn();
    const onClear = vi.fn();

    render(
      <ActivityLogFilters
        events={mockEvents}
        hash={{ ip: "192.168.1.1" }}
        hasFilters={true}
        onChange={onChange}
        onClear={onClear}
      />,
    );

    const clearBtn = screen.getByRole("button", { name: "Clear filters" });
    expect(clearBtn).toBeDefined();

    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalled();
  });

  it("handles event select change and triggers onChange with parsed values", () => {
    const onChange = vi.fn();
    const onClear = vi.fn();

    const { container } = render(
      <ActivityLogFilters
        events={mockEvents}
        hash={{}}
        hasFilters={false}
        onChange={onChange}
        onClear={onClear}
      />,
    );

    const select = container.querySelector("select");
    expect(select).toBeDefined();
    fireEvent.change(select!, {
      target: { value: "event:server:power.start" },
    });

    expect(onChange).toHaveBeenCalledWith({
      event: undefined,
      event_exact: "server:power.start",
    });
  });

  it("handles IP input submission on apply button click", () => {
    const onChange = vi.fn();
    const onClear = vi.fn();

    render(
      <ActivityLogFilters
        events={mockEvents}
        hash={{}}
        hasFilters={false}
        onChange={onChange}
        onClear={onClear}
      />,
    );

    const ipInput = screen.getByLabelText("IP address");
    fireEvent.change(ipInput, { target: { value: "10.0.0.1" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onChange).toHaveBeenCalledWith({ ip: "10.0.0.1" });
  });
});
