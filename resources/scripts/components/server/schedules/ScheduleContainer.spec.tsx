import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ScheduleContainer from "./ScheduleContainer";
import getServerSchedules from "@/api/server/schedules/getServerSchedules";
import { MemoryRouter } from "react-router";

vi.mock("@/api/server/schedules/getServerSchedules", () => ({
  default: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/components/elements/Can", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/server/schedules/ScheduleRow", () => ({
  default: ({ schedule }: any) => (
    <div data-testid="schedule-row">{schedule.name}</div>
  ),
}));

vi.mock("@/components/server/schedules/EditScheduleModal", () => ({
  default: ({ visible, onCreated }: any) =>
    visible ? (
      <div data-testid="edit-schedule-modal">
        <button onClick={() => onCreated({ id: 10 })}>
          Create Schedule Confirm
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/elements/Spinner", () => ({
  default: () => <span data-testid="spinner" />,
}));

vi.mock("@/components/elements/ServerContentBlock", () => ({
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

let mockSchedules: any[] = [];
const mockSetSchedules = vi.fn((scheds) => {
  mockSchedules = scheds;
});
const mockAddError = vi.fn();
const mockClearFlashes = vi.fn();

vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    addError: mockAddError,
    clearFlashes: mockClearFlashes,
  }),
}));

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        server: { data: { uuid: "srv-sched-uuid" } },
        schedules: { data: mockSchedules },
      }),
    useStoreActions: (selector: any) =>
      selector({
        schedules: { setSchedules: mockSetSchedules },
      }),
  },
}));

describe("components/server/schedules/ScheduleContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSchedules = [];
  });

  it("fetches schedules and displays empty state when none exist", async () => {
    render(
      <MemoryRouter>
        <ScheduleContainer />
      </MemoryRouter>,
    );

    expect(mockClearFlashes).toHaveBeenCalledWith("schedules");
    expect(getServerSchedules).toHaveBeenCalledWith("srv-sched-uuid");

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText(/No schedules yet/)).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Create schedule" }),
    ).toBeDefined();
  });

  it("renders list of schedules and opens create modal", async () => {
    mockSchedules = [
      { id: 1, name: "Restart Server", cron: {}, tasks: [] },
      { id: 2, name: "Daily Backup", cron: {}, tasks: [] },
    ];

    render(
      <MemoryRouter>
        <ScheduleContainer />
      </MemoryRouter>,
    );

    expect(screen.getByText("Restart Server")).toBeDefined();
    expect(screen.getByText("Daily Backup")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Create schedule" }));
    expect(screen.getByTestId("edit-schedule-modal")).toBeDefined();

    fireEvent.click(screen.getByText("Create Schedule Confirm"));
  });

  it("handles schedule fetch errors", async () => {
    vi.mocked(getServerSchedules).mockRejectedValueOnce(new Error("Failed"));

    render(
      <MemoryRouter>
        <ScheduleContainer />
      </MemoryRouter>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockAddError).toHaveBeenCalledWith(
      expect.objectContaining({ key: "schedules" }),
    );
  });
});
