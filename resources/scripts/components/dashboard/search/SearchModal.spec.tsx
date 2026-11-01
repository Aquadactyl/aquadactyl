import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import SearchModal from "./SearchModal";
import getServers from "@/api/getServers";
import { store } from "@/state";

vi.mock("@/api/getServers");

vi.mock("es-toolkit", () => ({
  debounce: (fn: any) => fn,
}));

vi.mock("@/components/elements/Modal", () => ({
  default: ({ visible, children }: any) =>
    visible ? <div data-testid="modal">{children}</div> : null,
}));

vi.mock("@/components/elements/InputSpinner", () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

describe("components/dashboard/search/SearchModal", () => {
  const onDismissed = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  it("renders search input when visible", () => {
    render(
      <MemoryRouter>
        <SearchModal visible={true} onDismissed={onDismissed} />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Search term")).toBeDefined();
    expect(
      screen.getByText(
        "Enter a server name, uuid, or allocation to begin searching.",
      ),
    ).toBeDefined();
  });

  it("does not render when visible is false", () => {
    render(
      <MemoryRouter>
        <SearchModal visible={false} onDismissed={onDismissed} />
      </MemoryRouter>,
    );

    expect(screen.queryByLabelText("Search term")).toBeNull();
  });

  it("performs search when typing 3 or more characters and displays results", async () => {
    vi.mocked(getServers).mockResolvedValueOnce({
      items: [
        {
          id: "serv_alpha" as any,
          uuid: "alpha-uuid",
          name: "Alpha Survival",
          node: "Node 1",
          isNodeUnderMaintenance: false,
          status: null,
          invocation: "",
          dockerImage: "",
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
          featureLimits: { databases: 1, allocations: 1, backups: 1 },
          isTransferring: false,
          eggFeatures: [],
          allocations: [
            {
              id: 1,
              ip: "10.0.0.1",
              alias: null,
              port: 25565,
              notes: "",
              isDefault: true,
            },
          ],
          variables: [],
        } as any,
      ],
      pagination: {
        total: 1,
        count: 1,
        perPage: 10,
        currentPage: 1,
        totalPages: 1,
      },
    });

    render(
      <MemoryRouter>
        <SearchModal visible={true} onDismissed={onDismissed} />
      </MemoryRouter>,
    );

    const input = screen.getByLabelText("Search term");
    fireEvent.change(input, { target: { value: "alp" } });

    await waitFor(() => {
      expect(getServers).toHaveBeenCalledWith({
        query: "alp",
        type: "admin-all",
      });
      expect(screen.getByText("Alpha Survival")).toBeDefined();
      expect(screen.getByText("10.0.0.1:25565")).toBeDefined();
    });

    // Form submit test
    fireEvent.submit(input.closest("form")!);

    // Click link to dismiss
    fireEvent.click(screen.getByText("Alpha Survival"));
    expect(onDismissed).toHaveBeenCalled();

    // Typing less than 3 characters clears search results
    fireEvent.change(input, { target: { value: "al" } });
    await waitFor(() => {
      expect(screen.queryByText("Alpha Survival")).toBeNull();
    });
  });

  it("searches as non-admin user with undefined type and renders allocation alias", async () => {
    store.getActions().user.setUserData({
      uuid: "usr-2",
      username: "regular",
      email: "user@test.com",
      language: "en",
      rootAdmin: false,
      useTotp: false,
      gravatar: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    vi.mocked(getServers).mockResolvedValueOnce({
      items: [
        {
          id: "serv_beta" as any,
          uuid: "beta-uuid",
          name: "Beta Creative",
          node: "Node 2",
          isNodeUnderMaintenance: false,
          status: null,
          invocation: "",
          dockerImage: "",
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
          featureLimits: { databases: 1, allocations: 1, backups: 1 },
          isTransferring: false,
          eggFeatures: [],
          allocations: [
            {
              id: 2,
              ip: "10.0.0.2",
              alias: "play.example.com",
              port: 25566,
              notes: "",
              isDefault: true,
            },
          ],
          variables: [],
        } as any,
      ],
      pagination: {
        total: 1,
        count: 1,
        perPage: 10,
        currentPage: 1,
        totalPages: 1,
      },
    });

    const { rerender } = render(
      <MemoryRouter>
        <SearchModal visible={true} onDismissed={onDismissed} />
      </MemoryRouter>,
    );

    const input = screen.getByLabelText("Search term");
    fireEvent.change(input, { target: { value: "beta" } });

    await waitFor(() => {
      expect(getServers).toHaveBeenCalledWith({
        query: "beta",
        type: undefined,
      });
      expect(screen.getByText("Beta Creative")).toBeDefined();
      expect(screen.getByText("play.example.com:25566")).toBeDefined();
    });

    // Close modal triggers reset and cleans up results
    rerender(
      <MemoryRouter>
        <SearchModal visible={false} onDismissed={onDismissed} />
      </MemoryRouter>,
    );
    expect(screen.queryByText("Beta Creative")).toBeNull();
  });

  it("handles search failure cleanly", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getServers).mockRejectedValueOnce(new Error("Network failed"));

    render(
      <MemoryRouter>
        <SearchModal visible={true} onDismissed={onDismissed} />
      </MemoryRouter>,
    );

    const input = screen.getByLabelText("Search term");
    fireEvent.change(input, { target: { value: "error-query" } });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });
});
