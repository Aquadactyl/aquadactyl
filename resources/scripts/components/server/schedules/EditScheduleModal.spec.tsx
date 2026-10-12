import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import EditScheduleModal from "./EditScheduleModal";
import { ServerContext } from "@/state/server";
import { Schedule } from "@/api/server/schedules/getServerSchedules";
import createOrUpdateSchedule from "@/api/server/schedules/createOrUpdateSchedule";
import { store } from "@/state";

vi.mock("@/api/server/schedules/createOrUpdateSchedule");

vi.mock("@/components/elements/Modal", () => ({
  default: ({ visible, children }: any) =>
    visible ? <div data-testid="modal">{children}</div> : null,
}));

const mockSchedule: Schedule = {
  id: 1,
  name: "Daily Restart",
  cron: { minute: "0", hour: "3", dayOfMonth: "*", month: "*", dayOfWeek: "*" },
  timezone: "UTC",
  isActive: true,
  isProcessing: false,
  onlyWhenOnline: true,
  lastRunAt: null,
  nextRunAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  tasks: [],
};

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);

  useEffect(() => {
    store.getActions().user.setUserData({
      uuid: "usr-1",
      username: "admin",
      email: "admin@test.com",
      language: "en",
      rootAdmin: true,
      useTotp: false,
      gravatar: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    setServer({
      id: "1",
      uuid: "server-uuid-1",
      name: "Test Server",
      node: "Node 1",
      isNodeUnderMaintenance: false,
      status: "running",
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
    });
  }, []);

  if (!isReady) return null;
  return <>{children}</>;
};

describe("components/server/schedules/EditScheduleModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders new schedule form when no schedule is provided", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <EditScheduleModal visible={true} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(await screen.findByLabelText("Schedule name")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Save timing & add steps" }),
    ).toBeDefined();
  });

  it("renders edit schedule form with existing schedule values", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <EditScheduleModal visible={true} schedule={mockSchedule} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(await screen.findByDisplayValue("Daily Restart")).toBeDefined();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDefined();
  });

  it("submits update when editing schedule", async () => {
    vi.mocked(createOrUpdateSchedule).mockResolvedValueOnce(mockSchedule);

    render(
      <ServerContext.Provider>
        <Wrapper>
          <EditScheduleModal visible={true} schedule={mockSchedule} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const submitBtn = await screen.findByRole("button", {
      name: "Save changes",
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createOrUpdateSchedule).toHaveBeenCalledWith(
        "server-uuid-1",
        expect.objectContaining({
          name: "Daily Restart",
          onlyWhenOnline: true,
        }),
      );
    });
  });
});
