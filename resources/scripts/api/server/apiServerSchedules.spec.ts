import { describe, it, expect, vi, beforeEach } from "vitest";
import http from "@/api/http";
import createOrUpdateSchedule from "./schedules/createOrUpdateSchedule";
import createOrUpdateScheduleTask from "./schedules/createOrUpdateScheduleTask";
import deleteSchedule from "./schedules/deleteSchedule";
import deleteScheduleTask from "./schedules/deleteScheduleTask";
import getServerSchedule from "./schedules/getServerSchedule";
import getServerSchedules, {
  rawDataToServerSchedule,
  rawDataToServerTask,
} from "./schedules/getServerSchedules";
import triggerScheduleExecution from "./schedules/triggerScheduleExecution";

vi.mock("@/api/http");

describe("api/server/schedules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTaskRaw = {
    id: 1,
    sequence_id: 1,
    action: "command",
    payload: "say Backup starting",
    time_offset: 0,
    is_queued: false,
    continue_on_failure: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  const mockScheduleRaw = {
    id: 10,
    name: "Nightly Restart",
    cron: {
      day_of_week: "*",
      month: "*",
      day_of_month: "*",
      hour: "4",
      minute: "0",
    },
    is_active: true,
    is_processing: false,
    only_when_online: true,
    last_run_at: "2026-01-01T04:00:00.000Z",
    next_run_at: "2026-01-02T04:00:00.000Z",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    relationships: {
      tasks: {
        data: [{ attributes: mockTaskRaw }],
      },
    },
  };

  it("rawDataToServerTask maps task fields correctly", () => {
    const task = rawDataToServerTask(mockTaskRaw);
    expect(task.id).toBe(1);
    expect(task.action).toBe("command");
    expect(task.payload).toBe("say Backup starting");
    expect(task.timeOffset).toBe(0);
    expect(task.createdAt).toBeInstanceOf(Date);
  });

  it("rawDataToServerSchedule maps schedule and relationship tasks", () => {
    const schedule = rawDataToServerSchedule(mockScheduleRaw);
    expect(schedule.id).toBe(10);
    expect(schedule.name).toBe("Nightly Restart");
    expect(schedule.cron.hour).toBe("4");
    expect(schedule.lastRunAt).toBeInstanceOf(Date);
    expect(schedule.nextRunAt).toBeInstanceOf(Date);
    expect(schedule.tasks).toHaveLength(1);
    expect(schedule.tasks[0].id).toBe(1);
  });

  it("rawDataToServerSchedule handles null lastRunAt and nextRunAt", () => {
    const schedule = rawDataToServerSchedule({
      ...mockScheduleRaw,
      last_run_at: null,
      next_run_at: null,
      relationships: {},
    });
    expect(schedule.lastRunAt).toBeNull();
    expect(schedule.nextRunAt).toBeNull();
    expect(schedule.tasks).toEqual([]);
  });

  it("createOrUpdateSchedule creates a new schedule when id is not provided", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({
      data: { attributes: mockScheduleRaw },
    } as any);

    const result = await createOrUpdateSchedule("srv-1", {
      name: "Nightly Restart",
      cron: {
        minute: "0",
        hour: "4",
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "*",
      },
      isActive: true,
      onlyWhenOnline: true,
    });

    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/schedules",
      {
        name: "Nightly Restart",
        minute: "0",
        hour: "4",
        day_of_month: "*",
        month: "*",
        day_of_week: "*",
        is_active: true,
        only_when_online: true,
      },
    );
    expect(result.id).toBe(10);
  });

  it("createOrUpdateSchedule updates existing schedule when id is provided", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({
      data: { attributes: mockScheduleRaw },
    } as any);

    const result = await createOrUpdateSchedule("srv-1", {
      id: 10,
      name: "Nightly Restart",
      cron: {
        minute: "0",
        hour: "4",
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "*",
      },
      isActive: true,
      onlyWhenOnline: true,
    });

    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/schedules/10",
      expect.any(Object),
    );
    expect(result.id).toBe(10);
  });

  it("createOrUpdateScheduleTask creates task when task id is omitted", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({
      data: { attributes: mockTaskRaw },
    } as any);

    const result = await createOrUpdateScheduleTask("srv-1", 10, undefined, {
      action: "command",
      payload: "say Hi",
      continueOnFailure: false,
      timeOffset: 0,
    });

    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/schedules/10/tasks",
      {
        action: "command",
        payload: "say Hi",
        continue_on_failure: false,
        time_offset: 0,
      },
    );
    expect(result.id).toBe(1);
  });

  it("createOrUpdateScheduleTask updates task when task id is provided", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({
      data: { attributes: mockTaskRaw },
    } as any);

    const result = await createOrUpdateScheduleTask("srv-1", 10, 1, {
      action: "command",
      payload: "say Hi",
      continueOnFailure: true,
      timeOffset: 5,
    });

    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/schedules/10/tasks/1",
      {
        action: "command",
        payload: "say Hi",
        continue_on_failure: true,
        time_offset: 5,
      },
    );
    expect(result.id).toBe(1);
  });

  it("deleteSchedule sends DELETE request", async () => {
    vi.mocked(http.delete).mockResolvedValueOnce({} as any);

    await deleteSchedule("srv-1", 10);

    expect(http.delete).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/schedules/10",
    );
  });

  it("deleteScheduleTask sends DELETE request", async () => {
    vi.mocked(http.delete).mockResolvedValueOnce({} as any);

    await deleteScheduleTask("srv-1", 10, 1);

    expect(http.delete).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/schedules/10/tasks/1",
    );
  });

  it("getServerSchedule fetches a single schedule", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: { attributes: mockScheduleRaw },
    } as any);

    const schedule = await getServerSchedule("srv-1", 10);

    expect(http.get).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/schedules/10",
      {
        params: { include: ["tasks"] },
      },
    );
    expect(schedule.id).toBe(10);
  });

  it("getServerSchedule rejects on error", async () => {
    vi.mocked(http.get).mockRejectedValueOnce(new Error("Schedule not found"));

    await expect(getServerSchedule("srv-1", 999)).rejects.toThrow(
      "Schedule not found",
    );
  });

  it("getServerSchedules fetches all schedules with tasks", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: {
        data: [{ attributes: mockScheduleRaw }],
      },
    } as any);

    const schedules = await getServerSchedules("srv-1");

    expect(http.get).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/schedules",
      {
        params: { include: ["tasks"] },
      },
    );
    expect(schedules).toHaveLength(1);
    expect(schedules[0].id).toBe(10);
  });

  it("triggerScheduleExecution posts execute request", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({} as any);

    await triggerScheduleExecution("srv-1", 10);

    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/srv-1/schedules/10/execute",
    );
  });
});
