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

  it("handles event select change with exact event and category", () => {
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

    const selects = container.querySelectorAll("select");
    const eventSelect = selects[0];

    fireEvent.change(eventSelect, {
      target: { value: "event:server:power.start" },
    });
    expect(onChange).toHaveBeenCalledWith({
      event: undefined,
      event_exact: "server:power.start",
    });

    fireEvent.change(eventSelect, {
      target: { value: "category:server:power." },
    });
    expect(onChange).toHaveBeenCalledWith({
      event: "server:power.",
      event_exact: undefined,
    });
  });

  it("renders custom/unknown event option when hash has unknown event", () => {
    const { container } = render(
      <ActivityLogFilters
        events={mockEvents}
        hash={{ event_exact: "custom:unknown.event" }}
        hasFilters={true}
        onChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    const eventSelect = container.querySelectorAll("select")[0];
    expect(eventSelect.value).toBe("event:custom:unknown.event");
  });

  it("renders custom/unknown category option when hash has category only", () => {
    const { container } = render(
      <ActivityLogFilters
        events={mockEvents}
        hash={{ event: "custom_unknown" }}
        hasFilters={true}
        onChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    const eventSelect = container.querySelectorAll("select")[0];
    expect(eventSelect.value).toBe("category:custom_unknown");
  });

  it("handles period, source, and sort select changes", () => {
    const onChange = vi.fn();

    const { container } = render(
      <ActivityLogFilters
        events={mockEvents}
        hash={{ period: "7d", source: "web", sort: "oldest" }}
        hasFilters={true}
        onChange={onChange}
        onClear={vi.fn()}
      />,
    );

    const selects = container.querySelectorAll("select");
    const periodSelect = selects[1];
    const sourceSelect = selects[2];
    const sortSelect = selects[3];

    fireEvent.change(periodSelect, { target: { value: "24h" } });
    expect(onChange).toHaveBeenCalledWith({
      period: "24h",
      date: undefined,
    });

    fireEvent.change(periodSelect, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({
      period: undefined,
      date: undefined,
    });

    fireEvent.change(sourceSelect, { target: { value: "sftp" } });
    expect(onChange).toHaveBeenCalledWith({ source: "sftp" });

    fireEvent.change(sourceSelect, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ source: undefined });

    fireEvent.change(sortSelect, { target: { value: "oldest" } });
    expect(onChange).toHaveBeenCalledWith({ sort: "oldest" });

    fireEvent.change(sortSelect, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ sort: undefined });
  });

  it("handles date calendar input change and clears period", () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <ActivityLogFilters
        events={mockEvents}
        hash={{ period: "7d" }}
        hasFilters={true}
        onChange={onChange}
        onClear={vi.fn()}
      />,
    );

    const dateInput = screen.getByLabelText("Date");
    fireEvent.change(dateInput, { target: { value: "2026-10-13" } });
    expect(onChange).toHaveBeenCalledWith({
      date: "2026-10-13",
      period: undefined,
    });

    rerender(
      <ActivityLogFilters
        events={mockEvents}
        hash={{ date: "2026-10-13" }}
        hasFilters={true}
        onChange={onChange}
        onClear={vi.fn()}
      />,
    );

    fireEvent.change(dateInput, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({
      date: undefined,
      period: undefined,
    });
  });

  it("handles IP input submission on apply button click (valid and empty)", () => {
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

    fireEvent.change(ipInput, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onChange).toHaveBeenCalledWith({ ip: undefined });
  });
});
