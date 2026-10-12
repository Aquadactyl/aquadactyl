import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ScheduleEditContainer from "./ScheduleEditContainer";
import getServerSchedule from "@/api/server/schedules/getServerSchedule";
import createOrUpdateSchedule from "@/api/server/schedules/createOrUpdateSchedule";
import { MemoryRouter, Routes, Route } from "react-router";

vi.mock("@/api/server/schedules/getServerSchedule", () => ({
  default: vi.fn(),
}));

vi.mock("@/api/server/schedules/createOrUpdateSchedule", () => ({
  default: vi.fn().mockResolvedValue({
    id: 1,
    name: "Backup Run",
    cron: {
      minute: "0",
      hour: "0",
      dayOfMonth: "*",
      month: "*",
      dayOfWeek: "*",
    },
    isActive: false,
    tasks: [],
  }),
}));

vi.mock("@/components/elements/Can", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/server/schedules/ScheduleTaskRow", () => ({
  default: ({ task }: any) => <div data-testid="task-row">{task.action}</div>,
}));

vi.mock("@/components/server/schedules/NewTaskButton", () => ({
  default: () => <button>New Task Mock</button>,
}));

vi.mock("@/components/server/schedules/DeleteScheduleButton", () => ({
  default: () => <button>Delete Schedule Mock</button>,
}));

vi.mock("@/components/server/schedules/RunScheduleButton", () => ({
  default: () => <button>Run Schedule Mock</button>,
}));

vi.mock("@/components/server/schedules/EditScheduleModal", () => ({
  default: ({ visible }: any) =>
    visible ? <div data-testid="edit-modal">Edit Modal</div> : null,
}));

vi.mock("@/components/elements/Spinner", () => ({
  default: () => <span data-testid="spinner" />,
}));

vi.mock("@/components/elements/PageContentBlock", () => ({
  default: ({ title, children }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("@/components/FlashMessageRender", () => ({
  default: () => null,
}));

let mockSchedule: any = {
  id: 1,
  name: "Backup Run",
  cron: { minute: "0", hour: "0", dayOfMonth: "*", month: "*", dayOfWeek: "*" },
  isActive: true,
  isProcessing: false,
  onlyWhenOnline: false,
  lastRunAt: new Date("2026-01-01T00:00:00Z"),
  nextRunAt: new Date("2026-01-02T00:00:00Z"),
  tasks: [
    {
      id: 1,
      action: "backup",
      payload: "",
      timeOffset: 0,
      continueOnFailure: false,
    },
  ],
};

const mockAppendSchedule = vi.fn();
const mockClearFlashes = vi.fn();
const mockClearAndAddHttpError = vi.fn();

vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    clearFlashes: mockClearFlashes,
    clearAndAddHttpError: mockClearAndAddHttpError,
  }),
}));

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        server: { data: { id: "srv-1", uuid: "srv-sched-uuid" } },
        schedules: { data: mockSchedule ? [mockSchedule] : [] },
      }),
    useStoreActions: (selector: any) =>
      selector({
        schedules: { appendSchedule: mockAppendSchedule },
      }),
  },
}));

vi.mock("@/state", () => ({
  useAppStore: (selector: any) =>
    selector({
      settings: { data: { timezone: "UTC" } },
    }),
}));

describe("components/server/schedules/ScheduleEditContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSchedule = {
      id: 1,
      name: "Backup Run",
      cron: {
        minute: "0",
        hour: "0",
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "*",
      },
      isActive: true,
      isProcessing: false,
      onlyWhenOnline: false,
      lastRunAt: new Date("2026-01-01T00:00:00Z"),
      nextRunAt: new Date("2026-01-02T00:00:00Z"),
      tasks: [
        {
          id: 1,
          action: "backup",
          payload: "",
          timeOffset: 0,
          continueOnFailure: false,
        },
      ],
    };
  });

  const renderComponent = () =>
    render(
      <MemoryRouter initialEntries={["/server/srv-1/schedules/1"]}>
        <Routes>
          <Route
            path="/server/:id/schedules/:id"
            element={<ScheduleEditContainer />}
          />
        </Routes>
      </MemoryRouter>,
    );

  it("renders existing schedule details and tasks", () => {
    renderComponent();

    expect(screen.getByText("Backup Run")).toBeDefined();
    expect(screen.getByText("New Task Mock")).toBeDefined();
    expect(screen.getByText("Delete Schedule Mock")).toBeDefined();
    expect(screen.getByText("Run Schedule Mock")).toBeDefined();
    expect(screen.getByTestId("task-row")).toBeDefined();
  });

  it("toggles automatic runs when clicking Pause schedule button", async () => {
    renderComponent();

    const toggleButton = screen.getByRole("button", { name: "Pause schedule" });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(createOrUpdateSchedule).toHaveBeenCalledWith("srv-sched-uuid", {
        ...mockSchedule,
        isActive: false,
      });
      expect(mockAppendSchedule).toHaveBeenCalled();
    });
  });

  it("fetches schedule when not already in state store", async () => {
    mockSchedule = null;
    vi.mocked(getServerSchedule).mockResolvedValueOnce({
      id: 1,
      name: "Fetched Schedule",
      cron: {
        minute: "0",
        hour: "0",
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "*",
      },
      isActive: true,
      tasks: [],
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(getServerSchedule).toHaveBeenCalledWith("srv-sched-uuid", 1);
      expect(mockAppendSchedule).toHaveBeenCalled();
    });
  });

  it("opens edit modal when clicking Edit timing", () => {
    renderComponent();

    fireEvent.click(screen.getByRole("button", { name: "Edit timing" }));
    expect(screen.getByTestId("edit-modal")).toBeDefined();
  });
});
