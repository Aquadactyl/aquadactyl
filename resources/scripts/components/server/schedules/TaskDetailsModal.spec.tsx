import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import ToastHost from "@/components/notifications/ToastHost";
import { describe, expect, it, vi, beforeEach } from "vitest";
import TaskDetailsModal from "./TaskDetailsModal";
import { ServerContext } from "@/state/server";
import { Schedule, Task } from "@/api/server/schedules/getServerSchedules";
import createOrUpdateScheduleTask from "@/api/server/schedules/createOrUpdateScheduleTask";

vi.mock("@/api/server/schedules/createOrUpdateScheduleTask");

vi.mock("@/components/elements/Modal", () => ({
  default: ({ visible, children }: any) =>
    visible ? <div data-testid="modal">{children}</div> : null,
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

let mockBackupLimit = 2;

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);

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
      featureLimits: { databases: 1, allocations: 1, backups: mockBackupLimit },
      isTransferring: false,
      eggFeatures: [],
      allocations: [],
      variables: [],
    } as any);
  }, []);

  if (!isReady) return null;
  return (
    <>
      <ToastHost />
      {children}
    </>
  );
};

describe("components/server/schedules/TaskDetailsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBackupLimit = 2;
  });

  it("renders Add step form when no task is provided", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <TaskDetailsModal visible={true} schedule={mockSchedule} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(
      await screen.findByRole("button", { name: "Add step" }),
    ).toBeDefined();
    expect(screen.getByLabelText("Wait before this step")).toBeDefined();
    expect(screen.getByLabelText("Wait unit")).toBeDefined();
  });

  it("renders Save step form with prepopulated task data", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <TaskDetailsModal
            visible={true}
            schedule={mockSchedule}
            task={mockTask}
          />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(
      await screen.findByRole("button", { name: "Save step" }),
    ).toBeDefined();
    expect(
      screen.getByDisplayValue("say Server restarting soon!"),
    ).toBeDefined();
  });

  it("submits createOrUpdateScheduleTask on submit and updates existing task", async () => {
    vi.mocked(createOrUpdateScheduleTask).mockResolvedValueOnce(mockTask);

    const scheduleWithTask = {
      ...mockSchedule,
      tasks: [mockTask, { ...mockTask, id: 999, sequenceId: 2 }],
    };

    render(
      <ServerContext.Provider>
        <Wrapper>
          <TaskDetailsModal
            visible={true}
            schedule={scheduleWithTask}
            task={mockTask}
          />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const submitBtn = await screen.findByRole("button", { name: "Save step" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createOrUpdateScheduleTask).toHaveBeenCalledWith(
        "server-uuid-1",
        1,
        10,
        {
          action: "command",
          payload: "say Server restarting soon!",
          timeOffset: 60,
          continueOnFailure: false,
        },
      );
    });
  });

  it("submits createOrUpdateScheduleTask when adding a brand new task", async () => {
    const newTask = { ...mockTask, id: 999 };
    vi.mocked(createOrUpdateScheduleTask).mockResolvedValueOnce(newTask);

    render(
      <ServerContext.Provider>
        <Wrapper>
          <TaskDetailsModal visible={true} schedule={mockSchedule} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const submitBtn = await screen.findByRole("button", { name: "Add step" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createOrUpdateScheduleTask).toHaveBeenCalledWith(
        "server-uuid-1",
        1,
        undefined,
        {
          action: "power",
          payload: "restart",
          timeOffset: 0,
          continueOnFailure: false,
        },
      );
    });
  });

  it("handles kind changes and restores task payload when switching back", async () => {
    const { container } = render(
      <ServerContext.Provider>
        <Wrapper>
          <TaskDetailsModal
            visible={true}
            schedule={mockSchedule}
            task={mockTask}
          />
        </Wrapper>
      </ServerContext.Provider>,
    );

    await screen.findByRole("button", { name: "Save step" });
    const kindSelect = container.querySelector("select[name='kind']")!;

    // Change to "backup" -> payload resets to ""
    fireEvent.change(kindSelect, { target: { value: "backup" } });
    expect(
      (
        screen.getByLabelText(
          "Files to leave out (optional)",
        ) as HTMLTextAreaElement
      ).value,
    ).toBe("");

    // Change back to "command" -> payload restores to task.payload
    fireEvent.change(kindSelect, { target: { value: "command" } });
    expect(
      (screen.getByLabelText("Console command") as HTMLTextAreaElement).value,
    ).toBe(mockTask.payload);
  });

  it("handles kind changes and renders specific warnings and fields", async () => {
    const { container } = render(
      <ServerContext.Provider>
        <Wrapper>
          <TaskDetailsModal visible={true} schedule={mockSchedule} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    await screen.findByRole("button", { name: "Add step" });

    const kindSelect = container.querySelector("select[name='kind']")!;

    // Change to "start" -> triggers online warning
    fireEvent.change(kindSelect, { target: { value: "start" } });
    expect(
      screen.getByText(/To start an offline server, edit this schedule/i),
    ).toBeDefined();

    // Change to "kill" -> triggers immediate stop warning
    fireEvent.change(kindSelect, { target: { value: "kill" } });
    expect(screen.getByText(/Stops the server immediately/i)).toBeDefined();

    // Change to "backup" -> shows files to leave out field
    fireEvent.change(kindSelect, { target: { value: "backup" } });
    expect(
      screen.getByLabelText("Files to leave out (optional)"),
    ).toBeDefined();

    // Change to "command" -> shows console command field
    fireEvent.change(kindSelect, { target: { value: "command" } });
    expect(screen.getByLabelText("Console command")).toBeDefined();
  });

  it("shows validation error when command payload is empty", async () => {
    const { container } = render(
      <ServerContext.Provider>
        <Wrapper>
          <TaskDetailsModal visible={true} schedule={mockSchedule} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    await screen.findByRole("button", { name: "Add step" });
    const kindSelect = container.querySelector("select[name='kind']")!;
    fireEvent.change(kindSelect, { target: { value: "command" } });

    const submitBtn = screen.getByRole("button", { name: "Add step" });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText("Enter the console command to send."),
    ).toBeDefined();
    expect(createOrUpdateScheduleTask).not.toHaveBeenCalled();
  });

  it("prevents backup creation when backupLimit is 0", async () => {
    mockBackupLimit = 0;

    render(
      <ServerContext.Provider>
        <Wrapper>
          <TaskDetailsModal visible={true} schedule={mockSchedule} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    await screen.findByRole("button", { name: "Add step" });
    expect(
      screen.getByText("Backups need at least one backup slot on this server."),
    ).toBeDefined();
  });

  it("handles createOrUpdateScheduleTask error", async () => {
    vi.mocked(createOrUpdateScheduleTask).mockRejectedValueOnce(
      new Error("API Error"),
    );

    render(
      <ServerContext.Provider>
        <Wrapper>
          <TaskDetailsModal
            visible={true}
            schedule={mockSchedule}
            task={mockTask}
          />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const submitBtn = await screen.findByRole("button", { name: "Save step" });
    fireEvent.click(submitBtn);

    expect(await screen.findByText("API Error")).toBeDefined();
  });

  it("renders subsequent step description when not first step", async () => {
    const existingTask = { ...mockTask, id: 99, sequenceId: 0 };
    const secondTask = { ...mockTask, id: 100, sequenceId: 1 };
    const scheduleWithTasks = {
      ...mockSchedule,
      tasks: [existingTask, secondTask],
    };

    render(
      <ServerContext.Provider>
        <Wrapper>
          <TaskDetailsModal
            visible={true}
            schedule={scheduleWithTasks}
            task={secondTask}
          />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(
      await screen.findByText(
        /0 sends this action straight after the previous step/i,
      ),
    ).toBeDefined();
  });

  it("shows validation error when kind is invalid or delay is invalid", async () => {
    const { container } = render(
      <ServerContext.Provider>
        <Wrapper>
          <TaskDetailsModal visible={true} schedule={mockSchedule} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    await screen.findByRole("button", { name: "Add step" });

    // Invalid / empty delay
    const delayInput = screen.getByLabelText("Wait before this step");
    fireEvent.change(delayInput, { target: { value: "" } });

    // Invalid kind
    const kindSelect = container.querySelector("select[name='kind']")!;
    fireEvent.change(kindSelect, { target: { value: "" } });

    const submitBtn = screen.getByRole("button", { name: "Add step" });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText("Choose what this step should do."),
    ).toBeDefined();
    expect(
      screen.getByText("Choose a whole number up to 15 minutes (900 seconds)."),
    ).toBeDefined();
  });

  it("shows error flash when submitting backup task and backupLimit is 0", async () => {
    mockBackupLimit = 0;
    const backupTask: Task = {
      ...mockTask,
      action: "backup",
      payload: "",
    };

    render(
      <ServerContext.Provider>
        <Wrapper>
          <TaskDetailsModal
            visible={true}
            schedule={mockSchedule}
            task={backupTask}
          />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const submitBtn = await screen.findByRole("button", { name: "Save step" });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(
        "Backups are unavailable because this server has no backup slots.",
      ),
    ).toBeDefined();
    expect(createOrUpdateScheduleTask).not.toHaveBeenCalled();
  });
});
