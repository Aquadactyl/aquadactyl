import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import RunScheduleButton from "@/components/server/schedules/RunScheduleButton";
import { ServerContext } from "@/state/server";
import triggerScheduleExecution from "@/api/server/schedules/triggerScheduleExecution";
import { Schedule } from "@/api/server/schedules/getServerSchedules";

vi.mock("@/api/server/schedules/triggerScheduleExecution");

vi.mock("@/components/elements/SpinnerOverlay", () => ({
  default: ({ visible }: { visible: boolean }) =>
    visible ? <div data-testid={"spinner"} /> : null,
}));

const mockClearFlashes = vi.fn();
const mockClearAndAddHttpError = vi.fn();
vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    clearFlashes: mockClearFlashes,
    clearAndAddHttpError: mockClearAndAddHttpError,
  }),
}));

const testSchedule: Schedule = {
  id: 5,
  name: "Daily Backup",
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
  lastRunAt: null,
  nextRunAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  tasks: [],
};

const Inner = ({ children }: { children: React.ReactNode }) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);

  useEffect(() => {
    setServer({
      id: "server-id-100",
      uuid: "server-uuid-100",
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

describe("RunScheduleButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders enabled Run now button when schedule is not processing", () => {
    render(
      <Wrapper>
        <RunScheduleButton schedule={testSchedule} />
      </Wrapper>,
    );

    const button = screen.getByRole("button", { name: "Run now" });
    expect(button.hasAttribute("disabled")).toBe(false);
  });

  it("renders disabled button when schedule is already processing", () => {
    render(
      <Wrapper>
        <RunScheduleButton schedule={{ ...testSchedule, isProcessing: true }} />
      </Wrapper>,
    );

    const button = screen.getByRole("button", { name: "Run now" });
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("triggers schedule execution on click", async () => {
    vi.mocked(triggerScheduleExecution).mockResolvedValueOnce(undefined as any);

    render(
      <Wrapper>
        <RunScheduleButton schedule={testSchedule} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Run now" }));

    await waitFor(() => {
      expect(triggerScheduleExecution).toHaveBeenCalledWith("server-id-100", 5);
    });
  });

  it("handles trigger execution failure", async () => {
    const error = new Error("Execution trigger failed");
    vi.mocked(triggerScheduleExecution).mockRejectedValueOnce(error);

    render(
      <Wrapper>
        <RunScheduleButton schedule={testSchedule} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Run now" }));

    await waitFor(() => {
      expect(mockClearAndAddHttpError).toHaveBeenCalledWith({
        error,
        key: "schedules",
      });
    });
  });
});
