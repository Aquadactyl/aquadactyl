import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import NewTaskButton from "./NewTaskButton";
import { Schedule } from "@/api/server/schedules/getServerSchedules";

vi.mock("@/components/server/schedules/TaskDetailsModal", () => ({
  default: ({ visible, onModalDismissed }: any) => (
    <div data-testid="task-details-modal" data-visible={visible}>
      <button onClick={onModalDismissed}>Dismiss</button>
    </div>
  ),
}));

const mockSchedule: Schedule = {
  id: 1,
  name: "Test Schedule",
  cron: { minute: "0", hour: "0", dayOfWeek: "*", dayOfMonth: "*", month: "*" },
  isActive: true,
  isProcessing: false,
  onlyWhenOnline: false,
  lastRunAt: null,
  nextRunAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  tasks: [],
};

describe("NewTaskButton", () => {
  it("renders with default label and toggles modal visibility", () => {
    render(<NewTaskButton schedule={mockSchedule} />);

    const button = screen.getByRole("button", { name: "Add step" });
    expect(button).toBeDefined();

    const modal = screen.getByTestId("task-details-modal");
    expect(modal.getAttribute("data-visible")).toBe("false");

    fireEvent.click(button);
    expect(modal.getAttribute("data-visible")).toBe("true");

    fireEvent.click(screen.getByText("Dismiss"));
    expect(modal.getAttribute("data-visible")).toBe("false");
  });

  it("renders with custom label", () => {
    render(<NewTaskButton schedule={mockSchedule} label="New Action" />);

    expect(screen.getByRole("button", { name: "New Action" })).toBeDefined();
  });
});
