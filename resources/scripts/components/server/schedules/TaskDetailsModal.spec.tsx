import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
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
      featureLimits: { databases: 1, allocations: 1, backups: 2 },
      isTransferring: false,
      eggFeatures: [],
      allocations: [],
      variables: [],
    } as any);
  }, []);

  if (!isReady) return null;
  return <>{children}</>;
};

describe("components/server/schedules/TaskDetailsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("submits createOrUpdateScheduleTask on submit", async () => {
    vi.mocked(createOrUpdateScheduleTask).mockResolvedValueOnce(mockTask);

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
});
