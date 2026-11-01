import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ScheduleTaskRow from "./ScheduleTaskRow";
import { ServerContext } from "@/state/server";
import { Schedule, Task } from "@/api/server/schedules/getServerSchedules";
import deleteScheduleTask from "@/api/server/schedules/deleteScheduleTask";

vi.mock("@/api/server/schedules/deleteScheduleTask");

vi.mock("@/components/elements/SpinnerOverlay", () => ({
  default: () => null,
}));

vi.mock("@/components/server/schedules/TaskDetailsModal", () => ({
  default: ({ visible, onModalDismissed }: any) =>
    visible ? (
      <div data-testid="task-details-modal">
        <button onClick={onModalDismissed}>Close</button>
      </div>
    ) : null,
}));

vi.mock("@/components/elements/ConfirmationModal", () => ({
  default: ({
    visible,
    onConfirmed,
    onDismissed,
    onModalDismissed,
    title,
  }: any) =>
    visible ? (
      <div data-testid="confirmation-modal">
        <h1>{title}</h1>
        <button onClick={onConfirmed}>Confirm</button>
        <button onClick={onModalDismissed || onDismissed}>Cancel</button>
      </div>
    ) : null,
}));

const mockAddError = vi.fn();
const mockClearFlashes = vi.fn();
vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    addError: mockAddError,
    clearFlashes: mockClearFlashes,
  }),
}));

const mockSchedule: Schedule = {
  id: 1,
  name: "Daily Restart",
  cron: { minute: "0", hour: "3", dayOfMonth: "*", month: "*", dayOfWeek: "*" },
  isActive: true,
  isProcessing: false,
  onlyWhenOnline: true,
  lastRunAt: null,
  nextRunAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  tasks: [],
};

const mockTask: Task = {
  id: 10,
  sequenceId: 1,
  action: "command",
  payload: "say Server restarting soon!",
  timeOffset: 60,
  continueOnFailure: false,
  isQueued: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const isReady = ServerContext.useStoreState(
    (s) => !!s.server.data && s.server.permissions.length > 0,
  );
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);
  const setPermissions = ServerContext.useStoreActions(
    (a) => a.server.setPermissions,
  );

  useEffect(() => {
    setServer({
      id: "serv_1" as any,
      uuid: "server-uuid-1",
      name: "Test Server",
      node: "Node 1",
      isNodeUnderMaintenance: false,
      status: null,
      invocation: "start",
      dockerImage: "java",
      sftpDetails: { ip: "127.0.0.1", port: 2022 },
      description: "",
      limits: {
        memory: 1024,
        swap: 0,
        disk: 1024,
        io: 500,
        cpu: 100,
        threads: "",
      },
      featureLimits: { databases: 1, allocations: 1, backups: 2 },
      isTransferring: false,
      eggFeatures: [],
      allocations: [],
      variables: [],
    } as any);
    setPermissions(["*"]);
  }, []);

  if (!isReady) return null;
  return <>{children}</>;
};

describe("components/server/schedules/ScheduleTaskRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders step details, command payload, and action buttons for step 1", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <ScheduleTaskRow
            schedule={mockSchedule}
            task={mockTask}
            stepNumber={1}
          />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(await screen.findByText(/Send console command/)).toBeDefined();
    expect(screen.getByText("say Server restarting soon!")).toBeDefined();
    expect(screen.getByText(/before starting/)).toBeDefined();
    expect(screen.getByLabelText("Edit scheduled task")).toBeDefined();
    expect(screen.getByLabelText("Delete scheduled task")).toBeDefined();
  });

  it("renders backup action with file ignoring note, step > 1 and continueOnFailure badge", async () => {
    const backupTask: Task = {
      ...mockTask,
      id: 20,
      action: "backup",
      payload: "*.log\n*.tmp",
      timeOffset: 120,
      continueOnFailure: true,
    };

    render(
      <ServerContext.Provider>
        <Wrapper>
          <ScheduleTaskRow
            schedule={mockSchedule}
            task={backupTask}
            stepNumber={2}
          />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(await screen.findByText("Ignoring files & folders:")).toBeDefined();
    expect(screen.getByText(/.*\.log.*\.tmp/s)).toBeDefined();
    expect(screen.getByText(/after the previous action is sent/)).toBeDefined();
    expect(screen.getByText(/Keeps going on connection failure/)).toBeDefined();
  });

  it("renders power action without payload box", async () => {
    const powerTask: Task = {
      ...mockTask,
      id: 30,
      action: "power",
      payload: "restart",
    };

    render(
      <ServerContext.Provider>
        <Wrapper>
          <ScheduleTaskRow schedule={mockSchedule} task={powerTask} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(await screen.findByText(/Restart server/)).toBeDefined();
    expect(screen.queryByText("restart")).toBeNull();
  });

  it("renders unknown power action fallback", async () => {
    const customTask: Task = {
      ...mockTask,
      id: 40,
      action: "power",
      payload: "custom_power_action",
    };

    render(
      <ServerContext.Provider>
        <Wrapper>
          <ScheduleTaskRow schedule={mockSchedule} task={customTask} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(await screen.findByText(/Send Power Action/)).toBeDefined();
  });

  it("opens edit modal and closes it", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <ScheduleTaskRow schedule={mockSchedule} task={mockTask} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const editBtn = await screen.findByLabelText("Edit scheduled task");
    fireEvent.click(editBtn);

    expect(screen.getByTestId("task-details-modal")).toBeDefined();
    fireEvent.click(screen.getByText("Close"));
    await waitFor(() => {
      expect(screen.queryByTestId("task-details-modal")).toBeNull();
    });
  });

  it("opens delete confirmation and cancels deletion", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <ScheduleTaskRow schedule={mockSchedule} task={mockTask} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const deleteBtn = await screen.findByLabelText("Delete scheduled task");
    fireEvent.click(deleteBtn);

    expect(screen.getByTestId("confirmation-modal")).toBeDefined();
    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() => {
      expect(screen.queryByTestId("confirmation-modal")).toBeNull();
    });
  });

  it("handles deletion failure", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(deleteScheduleTask).mockRejectedValueOnce(
      new Error("Failed to delete task"),
    );

    render(
      <ServerContext.Provider>
        <Wrapper>
          <ScheduleTaskRow schedule={mockSchedule} task={mockTask} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const deleteBtn = await screen.findByLabelText("Delete scheduled task");
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole("button", { name: "Confirm" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it("handles successful deletion", async () => {
    vi.mocked(deleteScheduleTask).mockResolvedValueOnce(undefined as any);

    render(
      <ServerContext.Provider>
        <Wrapper>
          <ScheduleTaskRow
            schedule={{ ...mockSchedule, tasks: [mockTask] }}
            task={mockTask}
          />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const deleteBtn = await screen.findByLabelText("Delete scheduled task");
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole("button", { name: "Confirm" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deleteScheduleTask).toHaveBeenCalledWith("server-uuid-1", 1, 10);
    });
  });

  it("renders unknown action fallback", async () => {
    const unknownTask: Task = {
      ...mockTask,
      id: 50,
      action: "weird_action" as any,
      payload: "something",
    };

    render(
      <ServerContext.Provider>
        <Wrapper>
          <ScheduleTaskRow schedule={mockSchedule} task={unknownTask} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(await screen.findByText(/Send console command/)).toBeDefined();
  });
});
