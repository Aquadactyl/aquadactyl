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

  it("submits new schedule and calls onCreated callback", async () => {
    const onCreated = vi.fn();
    vi.mocked(createOrUpdateSchedule).mockResolvedValueOnce({
      ...mockSchedule,
      id: 99,
      name: "New Fresh Schedule",
    });

    render(
      <ServerContext.Provider>
        <Wrapper>
          <EditScheduleModal visible={true} onCreated={onCreated} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const nameInput = await screen.findByLabelText("Schedule name");
    fireEvent.change(nameInput, { target: { value: "New Fresh Schedule" } });

    const submitBtn = screen.getByRole("button", {
      name: "Save timing & add steps",
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createOrUpdateSchedule).toHaveBeenCalledWith(
        "server-uuid-1",
        expect.objectContaining({
          name: "New Fresh Schedule",
        }),
      );
      expect(onCreated).toHaveBeenCalledWith(
        expect.objectContaining({ id: 99, name: "New Fresh Schedule" }),
      );
    });
  });

  it("shows validation error when name is empty", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <EditScheduleModal visible={true} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const nameInput = await screen.findByLabelText("Schedule name");
    fireEvent.change(nameInput, { target: { value: "   " } });

    const submitBtn = screen.getByRole("button", {
      name: "Save timing & add steps",
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Give this schedule a name.")).toBeDefined();
    });
  });

  it("shows validation error when name exceeds 191 characters", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <EditScheduleModal visible={true} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const nameInput = await screen.findByLabelText("Schedule name");
    nameInput.removeAttribute("maxlength");
    fireEvent.change(nameInput, { target: { value: "a".repeat(192) } });

    const submitBtn = screen.getByRole("button", {
      name: "Save timing & add steps",
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Use a name with no more than 191 characters."),
      ).toBeDefined();
    });
  });

  it("shows validation errors when custom cron fields are empty", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <EditScheduleModal
            visible={true}
            schedule={{
              ...mockSchedule,
              cron: {
                minute: "30",
                hour: "",
                dayOfMonth: "",
                month: "",
                dayOfWeek: "",
              },
            }}
          />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const nameInput = await screen.findByLabelText("Schedule name");
    fireEvent.change(nameInput, { target: { value: "Custom Cron Schedule" } });

    const freqSelect = document.getElementById("schedule-frequency-native");
    expect(freqSelect).toBeDefined();
    fireEvent.change(freqSelect!, { target: { value: "custom" } });

    const submitBtn = screen.getByRole("button", {
      name: "Save changes",
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getAllByText("Enter a cron value, or * for any.").length,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  it("handles error during submission", async () => {
    vi.mocked(createOrUpdateSchedule).mockRejectedValueOnce(
      new Error("Failed to save schedule"),
    );

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
      expect(createOrUpdateSchedule).toHaveBeenCalled();
    });
  });

  it("shows timing errors when basic timing values are invalid", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <EditScheduleModal visible={true} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const nameInput = await screen.findByLabelText("Schedule name");
    fireEvent.change(nameInput, { target: { value: "Invalid Time Schedule" } });

    const timeInput = await screen.findByLabelText("Time (24-hour)");
    fireEvent.change(timeInput, { target: { value: "99:99" } });

    const submitBtn = screen.getByRole("button", {
      name: "Save timing & add steps",
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Choose a time in 24-hour format, such as 03:00."),
      ).toBeDefined();
    });
  });
});
