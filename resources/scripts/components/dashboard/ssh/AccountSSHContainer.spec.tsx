import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AccountSSHContainer from "./AccountSSHContainer";

let mockData: any = null;
let mockIsValidating = false;
let mockError: any = null;
const mockClearAndAddHttpError = vi.fn();

vi.mock("@/plugins/useFlash", () => ({
  useFlashKey: () => ({
    clearAndAddHttpError: mockClearAndAddHttpError,
  }),
}));

vi.mock("@/api/account/ssh-keys", () => ({
  useSSHKeys: () => ({
    data: mockData,
    isValidating: mockIsValidating,
    error: mockError,
  }),
}));

vi.mock("@/components/elements/SensitiveValue", () => ({
  default: ({ children }: any) => <span>{children}</span>,
}));

vi.mock("@/components/dashboard/ssh/CreateSSHKeyForm", () => ({
  default: () => <div data-testid="create-ssh-key-form" />,
}));

vi.mock("@/components/dashboard/ssh/DeleteSSHKeyButton", () => ({
  default: ({ name }: any) => <button>Delete {name}</button>,
}));

vi.mock("@/components/elements/PageContentBlock", () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("@/components/elements/SpinnerOverlay", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Account/SSH/BeforeContent", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Account/SSH/AfterContent", () => ({
  default: () => null,
}));

describe("components/dashboard/ssh/AccountSSHContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = null;
    mockIsValidating = false;
    mockError = null;
  });

  it("renders loading state when data is not yet loaded", () => {
    mockIsValidating = true;
    render(<AccountSSHContainer />);

    expect(screen.getByText("Loading...")).toBeTruthy();
    expect(screen.getByTestId("create-ssh-key-form")).toBeTruthy();
  });

  it("renders empty state when no keys exist", () => {
    mockData = [];
    render(<AccountSSHContainer />);

    expect(
      screen.getByText("No SSH Keys exist for this account."),
    ).toBeTruthy();
  });

  it("renders list of SSH keys with delete buttons", () => {
    mockData = [
      {
        name: "My MacBook Key",
        fingerprint: "SHA256:1234567890abcdef",
        createdAt: new Date("2026-10-12T10:00:00Z"),
      },
      {
        name: "Work PC",
        fingerprint: "SHA256:abcdef1234567890",
        createdAt: new Date("2026-10-12T11:00:00Z"),
      },
    ];

    render(<AccountSSHContainer />);

    expect(screen.getByText("My MacBook Key")).toBeTruthy();
    expect(screen.getByText("Work PC")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Delete My MacBook Key" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete Work PC" })).toBeTruthy();
  });

  it("flashes error when request fails", () => {
    mockError = new Error("Failed to fetch keys");
    render(<AccountSSHContainer />);

    expect(mockClearAndAddHttpError).toHaveBeenCalledWith(mockError);
  });
});
