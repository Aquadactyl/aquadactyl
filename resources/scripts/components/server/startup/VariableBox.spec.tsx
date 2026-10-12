import { render, screen } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import VariableBox from "@/components/server/startup/VariableBox";
import { ServerContext } from "@/state/server";
import { ServerEggVariable } from "@/api/server/types";

vi.mock("@/api/server/updateStartupVariable");

vi.mock("@/api/server/startup/getServerStartup", () => ({
  default: () => ({
    mutate: vi.fn(),
  }),
}));

const mockClearFlashes = vi.fn();
const mockClearAndAddHttpError = vi.fn();
vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    clearFlashes: mockClearFlashes,
    clearAndAddHttpError: mockClearAndAddHttpError,
  }),
}));

const baseVariable: ServerEggVariable = {
  name: "Server Version",
  description: "The version of the server to run.",
  envVariable: "SERVER_VERSION",
  defaultValue: "latest",
  serverValue: "1.20.4",
  isEditable: true,
  rules: ["string"],
};

const Inner = ({
  permissions = ["startup.update"],
  children,
}: {
  permissions?: string[];
  children: React.ReactNode;
}) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);
  const setPermissions = ServerContext.useStoreActions(
    (a) => a.server.setPermissions,
  );

  useEffect(() => {
    setServer({
      id: "1",
      uuid: "server-startup-uuid",
    } as any);
    setPermissions(permissions);
  }, [setServer, setPermissions, permissions]);

  if (!isReady) return null;

  return <>{children}</>;
};

const Wrapper = ({
  permissions = ["startup.update"],
  children,
}: {
  permissions?: string[];
  children: React.ReactNode;
}) => {
  return (
    <ServerContext.Provider>
      <Inner permissions={permissions}>{children}</Inner>
    </ServerContext.Provider>
  );
};

describe("VariableBox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders text input with default and current server value", () => {
    render(
      <Wrapper>
        <VariableBox variable={baseVariable} />
      </Wrapper>,
    );

    expect(screen.getByText("Server Version")).toBeDefined();
    expect(screen.getByText("The version of the server to run.")).toBeDefined();

    const input = screen.getByDisplayValue("1.20.4") as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.placeholder).toBe("latest");
  });

  it("renders Read Only badge when variable is not editable", () => {
    render(
      <Wrapper>
        <VariableBox
          variable={{
            ...baseVariable,
            isEditable: false,
          }}
        />
      </Wrapper>,
    );

    expect(screen.getByText("Read Only")).toBeDefined();
    const input = screen.getByDisplayValue("1.20.4") as HTMLInputElement;
    expect(input.readOnly).toBe(true);
  });

  it("renders Switch when rules specify boolean toggle", () => {
    const booleanVariable: ServerEggVariable = {
      name: "Auto Update",
      description: "Automatically update on restart",
      envVariable: "AUTO_UPDATE",
      defaultValue: "1",
      serverValue: "1",
      isEditable: true,
      rules: ["in:0,1"],
    };

    render(
      <Wrapper>
        <VariableBox variable={booleanVariable} />
      </Wrapper>,
    );

    expect(screen.getByText("Auto Update")).toBeDefined();
    // Should render switch toggle
    const switchElement = screen.getByRole("switch");
    expect(switchElement).toBeDefined();
    expect(switchElement.getAttribute("aria-checked")).toBe("true");
  });

  it("renders Select dropdown when rules specify enum list", () => {
    const selectVariable: ServerEggVariable = {
      name: "Difficulty",
      description: "Game difficulty level",
      envVariable: "DIFFICULTY",
      defaultValue: "normal",
      serverValue: "hard",
      isEditable: true,
      rules: ["in:peaceful,easy,normal,hard"],
    };

    const { container } = render(
      <Wrapper>
        <VariableBox variable={selectVariable} />
      </Wrapper>,
    );

    expect(screen.getByText("Difficulty")).toBeDefined();
    const select = container.querySelector("select");
    expect(select).toBeDefined();
    expect(select?.value).toBe("hard");
  });
});
