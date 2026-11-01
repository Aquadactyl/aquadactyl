import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import DeleteScheduleButton from "@/components/server/schedules/DeleteScheduleButton";
import { ServerContext } from "@/state/server";
import deleteSchedule from "@/api/server/schedules/deleteSchedule";

vi.mock("@/api/server/schedules/deleteSchedule");

// Mock SpinnerOverlay to avoid happy-dom animation cancellations
vi.mock("@/components/elements/SpinnerOverlay", () => ({
  default: ({ visible }: { visible: boolean }) =>
    visible ? <div data-testid={"spinner"} /> : null,
}));

const mockAddError = vi.fn();
const mockClearFlashes = vi.fn();
vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    addError: mockAddError,
    clearFlashes: mockClearFlashes,
  }),
}));

const Inner = ({ children }: { children: React.ReactNode }) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);

  useEffect(() => {
    setServer({
      id: "1",
      uuid: "server-sched-uuid",
    } as any);
  }, [setServer]);

  if (!isReady) return null;

  return <>{children}</>;
};

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <ServerContext.Provider>
      <Inner>{children}</Inner>
    </ServerContext.Provider>
  );
};

describe("DeleteScheduleButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders delete button and opens confirmation dialog when clicked", () => {
    render(
      <Wrapper>
        <DeleteScheduleButton scheduleId={10} onDeleted={vi.fn()} />
      </Wrapper>,
    );

    const deleteBtn = screen.getByRole("button", { name: "Delete" });
    expect(deleteBtn).toBeDefined();

    fireEvent.click(deleteBtn);

    expect(screen.getByText("Delete Schedule")).toBeDefined();
    expect(
      screen.getByText(
        "This deletes the schedule and all its steps. Your server will keep running.",
      ),
    ).toBeDefined();
  });

  it("calls deleteSchedule API and triggers onDeleted callback on confirm", async () => {
    vi.mocked(deleteSchedule).mockResolvedValueOnce(undefined as any);
    const onDeleted = vi.fn();

    render(
      <Wrapper>
        <DeleteScheduleButton scheduleId={10} onDeleted={onDeleted} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    // In the confirmation dialog, the action button is also labeled "Delete"
    const confirmButtons = screen.getAllByRole("button", { name: "Delete" });
    // Click the confirm button in the dialog (the last one)
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(deleteSchedule).toHaveBeenCalledWith("server-sched-uuid", 10);
      expect(onDeleted).toHaveBeenCalled();
    });
  });

  it("handles deletion failure and reports error message", async () => {
    const error = new Error("Delete schedule failed");
    vi.mocked(deleteSchedule).mockRejectedValueOnce(error);

    render(
      <Wrapper>
        <DeleteScheduleButton scheduleId={10} onDeleted={vi.fn()} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const confirmButtons = screen.getAllByRole("button", { name: "Delete" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith({
        key: "schedules",
        message: "Delete schedule failed",
      });
    });
  });

  it("closes dialog when clicking cancel", async () => {
    render(
      <Wrapper>
        <DeleteScheduleButton scheduleId={10} onDeleted={vi.fn()} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete Schedule")).toBeDefined();

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText("Delete Schedule")).toBeNull();
    });
  });
});
