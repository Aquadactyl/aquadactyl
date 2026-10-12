import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import SettingsContainer from "./SettingsContainer";

vi.mock("@/plugins/usePanelTranslation", () => ({
  default: () => ({ t: (_k: string, fallback?: string) => fallback || _k }),
}));

vi.mock("@/components/elements/TitledGreyBox", () => ({
  default: ({ title, children, className }: any) => (
    <div data-testid="titled-grey-box" className={className}>
      <header>{title}</header>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("@/components/elements/ServerContentBlock", () => ({
  default: ({ title, children }: any) => (
    <div data-testid="server-content-block">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("@/components/FlashMessageRender", () => ({
  default: () => null,
}));

vi.mock("@/components/elements/Can", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/server/settings/RenameServerBox", () => ({
  default: () => <div data-testid="rename-server-box">RenameBox</div>,
}));

vi.mock("@/components/server/settings/ReinstallServerBox", () => ({
  default: () => <div data-testid="reinstall-server-box">ReinstallBox</div>,
}));

vi.mock("@/components/elements/CopyOnClick", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@blueprint/components/Server/Settings/BeforeContent", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Server/Settings/AfterContent", () => ({
  default: () => null,
}));

let mockServerState: any = {
  data: {
    id: "srv-1",
    uuid: "1111-2222-3333-4444",
    node: "Node Alpha",
    sftpDetails: {
      ip: "10.0.0.1",
      port: 2022,
    },
  },
};

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) => selector({ server: mockServerState }),
  },
}));

vi.mock("@/state", () => ({
  useAppStore: (selector: any) =>
    selector({
      user: { data: { username: "steve" } },
      settings: { data: { features: { privacyMode: true } } },
    }),
}));

describe("SettingsContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders SFTP details, launch button, and debug information", () => {
    render(<SettingsContainer />);

    expect(screen.getByText("Settings")).toBeDefined();
    expect(screen.getByText("SFTP Details")).toBeDefined();
    expect(screen.getByDisplayValue("sftp://10.0.0.1:2022")).toBeDefined();
    expect(screen.getByDisplayValue("steve.srv-1")).toBeDefined();
    expect(screen.getByText("Node Alpha")).toBeDefined();
    expect(screen.getByText("1111-2222-3333-4444")).toBeDefined();
    expect(screen.getByRole("link", { name: /Launch SFTP/i })).toBeDefined();
    expect(screen.getByTestId("rename-server-box")).toBeDefined();
    expect(screen.getByTestId("reinstall-server-box")).toBeDefined();
  });
});
