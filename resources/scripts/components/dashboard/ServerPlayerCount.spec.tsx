import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import ServerPlayerCount from "./ServerPlayerCount";
import { Server } from "@/api/server/getServer";

let mockQueryData: any = null;
let mockQueryError: any = null;

vi.mock("@/lib/queryClient", () => ({
  useTanStackQuery: () => ({
    data: mockQueryData,
    error: mockQueryError,
  }),
}));

vi.mock("@/api/server/getGameQuery", () => ({
  default: vi.fn(),
}));

const baseServer: Server = {
  id: "srv-1" as any,
  identifier: "serv_1" as any,
  internalId: 1,
  uuid: "uuid-1",
  name: "Server",
  node: "Node1",
  isNodeUnderMaintenance: false,
  status: null,
  skipScripts: false,
  invocation: "java",
  dockerImage: "java",
  sftpDetails: { ip: "127.0.0.1", port: 2022 },
  description: "",
  limits: { memory: 1024, swap: 0, disk: 1024, io: 500, cpu: 100, threads: "" },
  featureLimits: { databases: 1, allocations: 1, backups: 1 },
  isTransferring: false,
  eggFeatures: [],
  allocations: [],
  variables: [],
  gameQueryType: "minecraft",
  BlueprintFramework: { eggId: 1 },
};

describe("components/dashboard/ServerPlayerCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryData = null;
    mockQueryError = null;
  });

  it("returns null if server has no gameQueryType", () => {
    const serverWithoutQuery = { ...baseServer, gameQueryType: null as any };
    const { container } = render(
      <ServerPlayerCount server={serverWithoutQuery} state="running" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows Offline when not running and state is offline", () => {
    render(<ServerPlayerCount server={baseServer} state="offline" />);
    expect(screen.getByText("Offline")).toBeDefined();
    expect(
      screen.getByTitle(
        "Player counts are queried while the server is running.",
      ),
    ).toBeDefined();
  });

  it("shows Starting... when state is starting", () => {
    render(<ServerPlayerCount server={baseServer} state="starting" />);
    expect(screen.getByText("Starting...")).toBeDefined();
  });

  it("shows Unavailable when state is stopping or another non-running state", () => {
    render(<ServerPlayerCount server={baseServer} state="stopping" />);
    expect(screen.getByText("Unavailable")).toBeDefined();
  });

  it("shows Checking... when query is pending/loading", () => {
    mockQueryData = { status: "pending" };
    render(<ServerPlayerCount server={baseServer} state="running" />);
    expect(screen.getByText("Checking...")).toBeDefined();
    expect(screen.getByTitle("Waiting for the game query.")).toBeDefined();
  });

  it("shows player count when status is available with maxPlayers", () => {
    mockQueryData = {
      status: "available",
      players: 12,
      maxPlayers: 50,
      checkedAt: new Date("2026-01-01T12:00:00Z"),
    };
    render(<ServerPlayerCount server={baseServer} state="running" />);
    expect(screen.getByText("12 / 50")).toBeDefined();
    expect(screen.getByTitle(/Last checked/)).toBeDefined();
  });

  it("shows player count without maxPlayers when maxPlayers is omitted", () => {
    mockQueryData = {
      status: "available",
      players: 5,
      maxPlayers: 0,
      checkedAt: new Date(),
    };
    render(<ServerPlayerCount server={baseServer} state="running" />);
    expect(screen.getByText("5")).toBeDefined();
  });

  it("shows Unavailable on query error or unavailable/unsupported status", () => {
    mockQueryData = { status: "unavailable" };
    const { rerender } = render(
      <ServerPlayerCount server={baseServer} state="running" />,
    );
    expect(screen.getByText("Unavailable")).toBeDefined();
    expect(screen.getByTitle(/The game did not respond/)).toBeDefined();

    mockQueryData = { status: "unsupported" };
    rerender(<ServerPlayerCount server={baseServer} state="running" />);
    expect(screen.getByText("Unavailable")).toBeDefined();

    mockQueryData = null;
    mockQueryError = new Error("Query timeout");
    rerender(<ServerPlayerCount server={baseServer} state="running" />);
    expect(screen.getByText("Unavailable")).toBeDefined();
  });
});
