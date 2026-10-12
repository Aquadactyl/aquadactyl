import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import NavigationBar from "./NavigationBar";
import http from "@/api/http";

vi.mock("@/plugins/usePanelTranslation", () => ({
  default: () => ({
    t: (key: string, fallback?: string, params?: Record<string, any>) => {
      let str = fallback || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          str = str.replace(new RegExp(`{{${k}}}`, "g"), String(v));
        });
      }
      return str;
    },
  }),
}));

vi.mock("@/api/http");

vi.mock("@/components/dashboard/search/SearchContainer", () => ({
  default: () => <div data-testid="search-container" />,
}));

vi.mock("@/components/Avatar", () => ({
  default: {
    User: () => <span data-testid="avatar-user" />,
  },
}));

vi.mock("@/components/elements/tooltip/Tooltip", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/elements/SpinnerOverlay", () => ({
  default: ({ visible }: any) => (
    <div data-testid="spinner-overlay" data-visible={visible} />
  ),
}));

vi.mock(
  "@blueprint/components/Navigation/NavigationBar/BeforeNavigation",
  () => ({
    default: () => null,
  }),
);
vi.mock(
  "@blueprint/components/Navigation/NavigationBar/AdditionalItems",
  () => ({
    default: () => null,
  }),
);
vi.mock(
  "@blueprint/components/Navigation/NavigationBar/AfterNavigation",
  () => ({
    default: () => null,
  }),
);

let mockAppState: any = {
  settings: {
    data: {
      name: "Aquadactyl",
      logoUrl: "",
      showNameWithLogo: false,
    },
  },
  user: {
    data: {
      username: "testuser",
      rootAdmin: false,
    },
  },
};

vi.mock("@/state", () => ({
  useAppStore: (selector: any) => selector(mockAppState),
}));

describe("NavigationBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppState = {
      settings: {
        data: {
          name: "Aquadactyl",
          logoUrl: "",
          showNameWithLogo: false,
        },
      },
      user: {
        data: {
          username: "testuser",
          rootAdmin: false,
        },
      },
    };
  });

  it("renders default brand with wordmark for Aquadactyl", () => {
    render(
      <MemoryRouter>
        <NavigationBar />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: /Aquadactyl home/i }),
    ).toBeDefined();
    expect(screen.getByText("Servers")).toBeDefined();
    expect(screen.getByText("testuser")).toBeDefined();
    expect(screen.queryByText("Admin")).toBeNull();
  });

  it("renders custom brand emblem and name when not named Aquadactyl and no custom logo", () => {
    mockAppState.settings.data = {
      name: "My Custom Host",
      logoUrl: "",
      showNameWithLogo: false,
    };

    render(
      <MemoryRouter>
        <NavigationBar />
      </MemoryRouter>,
    );

    expect(screen.getByText("My Custom Host")).toBeDefined();
  });

  it("renders custom logo and site name when logoUrl and showNameWithLogo are enabled", () => {
    mockAppState.settings.data = {
      name: "Acme Cloud",
      logoUrl: "https://example.com/logo.png",
      showNameWithLogo: true,
    };

    const { container } = render(
      <MemoryRouter>
        <NavigationBar />
      </MemoryRouter>,
    );

    const logo = container.querySelector(
      ".custom-site-logo",
    ) as HTMLImageElement;
    expect(logo).toBeDefined();
    expect(logo.src).toBe("https://example.com/logo.png");
    expect(screen.getByText("Acme Cloud")).toBeDefined();
  });

  it("renders admin link when user is rootAdmin", () => {
    mockAppState.user.data.rootAdmin = true;

    render(
      <MemoryRouter>
        <NavigationBar />
      </MemoryRouter>,
    );

    const adminLink = screen.getByRole("link", { name: /Administration/i });
    expect(adminLink).toBeDefined();
    expect(adminLink.getAttribute("href")).toBe("/admin");
  });

  it("handles logout button trigger", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({} as any);
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { assign: assignSpy },
    });

    render(
      <MemoryRouter>
        <NavigationBar />
      </MemoryRouter>,
    );

    const logoutButton = screen.getByRole("button", { name: /Sign out/i });
    fireEvent.click(logoutButton);

    expect(http.post).toHaveBeenCalledWith("/auth/logout");

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith("/");
    });
  });
});
