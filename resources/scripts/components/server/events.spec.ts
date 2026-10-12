import { describe, expect, it } from "vitest";
import { SocketEvent, SocketRequest } from "./events";

describe("components/server/events", () => {
  it("exports SocketEvent and SocketRequest enums with expected values", () => {
    expect(SocketEvent.DAEMON_MESSAGE).toBe("daemon message");
    expect(SocketEvent.DAEMON_ERROR).toBe("daemon error");
    expect(SocketEvent.INSTALL_OUTPUT).toBe("install output");
    expect(SocketEvent.INSTALL_STARTED).toBe("install started");
    expect(SocketEvent.INSTALL_COMPLETED).toBe("install completed");
    expect(SocketEvent.CONSOLE_OUTPUT).toBe("console output");
    expect(SocketEvent.STATUS).toBe("status");
    expect(SocketEvent.STATS).toBe("stats");
    expect(SocketEvent.TRANSFER_LOGS).toBe("transfer logs");
    expect(SocketEvent.TRANSFER_STATUS).toBe("transfer status");
    expect(SocketEvent.BACKUP_COMPLETED).toBe("backup completed");
    expect(SocketEvent.BACKUP_RESTORE_COMPLETED).toBe(
      "backup restore completed",
    );

    expect(SocketRequest.SEND_LOGS).toBe("send logs");
    expect(SocketRequest.SEND_STATS).toBe("send stats");
    expect(SocketRequest.SET_STATE).toBe("set state");
  });
});
