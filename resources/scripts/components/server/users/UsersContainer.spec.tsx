import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import UsersContainer from "./UsersContainer";
import getServerSubusers from "@/api/server/users/getServerSubusers";

vi.mock("@/api/server/users/getServerSubusers", () => ({
  default: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/components/elements/Can", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/server/users/UserRow", () => ({
  default: ({ subuser }: any) => (
    <div data-testid="user-row">{subuser.username}</div>
  ),
}));

vi.mock("@/components/server/users/AddSubuserButton", () => ({
  default: () => <button>Add Subuser Mock</button>,
}));

vi.mock("@/components/elements/Spinner", () => ({
  default: () => <span data-testid="spinner" />,
}));

vi.mock("@/components/elements/ServerContentBlock", () => ({
  default: ({ title, children }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("@/components/FlashMessageRender", () => ({
  default: () => null,
}));

let mockSubusers: any[] = [];
const mockSetSubusers = vi.fn((users) => {
  mockSubusers = users;
});
const mockAddError = vi.fn();
const mockClearFlashes = vi.fn();

vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    addError: mockAddError,
    clearFlashes: mockClearFlashes,
  }),
}));

let mockPermissions: Record<string, any> = { control: {} };
const mockGetPermissions = vi.fn().mockResolvedValue({});

vi.mock("@/state", () => ({
  useAppStore: (selector: any) =>
    selector({
      permissions: {
        data: mockPermissions,
        getPermissions: mockGetPermissions,
      },
    }),
}));

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        server: { data: { uuid: "srv-usr-uuid" } },
        subusers: { data: mockSubusers },
      }),
    useStoreActions: (selector: any) =>
      selector({
        subusers: { setSubusers: mockSetSubusers },
      }),
  },
}));

describe("components/server/users/UsersContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubusers = [];
    mockPermissions = { control: {} };
  });

  it("loads subusers and displays empty state when none exist", async () => {
    render(<UsersContainer />);

    expect(mockClearFlashes).toHaveBeenCalledWith("users");
    expect(getServerSubusers).toHaveBeenCalledWith("srv-usr-uuid");
    expect(mockGetPermissions).toHaveBeenCalled();

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText(/subusers/i)).toBeDefined();
    expect(screen.getByText("Add Subuser Mock")).toBeDefined();
  });

  it("renders list of subusers when present", () => {
    mockSubusers = [
      {
        uuid: "usr-1",
        username: "alex",
        email: "alex@test.com",
        permissions: [],
      },
      {
        uuid: "usr-2",
        username: "sam",
        email: "sam@test.com",
        permissions: [],
      },
    ];

    render(<UsersContainer />);

    expect(screen.getByText("alex")).toBeDefined();
    expect(screen.getByText("sam")).toBeDefined();
  });

  it("handles subuser fetch failure", async () => {
    vi.mocked(getServerSubusers).mockRejectedValueOnce(
      new Error("Network fail"),
    );

    render(<UsersContainer />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockAddError).toHaveBeenCalledWith(
      expect.objectContaining({ key: "users" }),
    );
  });
});
