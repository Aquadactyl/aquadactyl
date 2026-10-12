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
  });
});
