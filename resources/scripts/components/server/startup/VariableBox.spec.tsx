import { act, fireEvent, render, screen } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import VariableBox from "@/components/server/startup/VariableBox";
import { ServerContext } from "@/state/server";
import { ServerEggVariable } from "@/api/server/types";
import updateStartupVariable from "@/api/server/updateStartupVariable";

vi.mock("@/api/server/updateStartupVariable");

const mockMutate = vi.fn();
vi.mock("@/api/server/startup/getServerStartup", () => ({
  default: () => ({
    mutate: mockMutate,
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

vi.mock("@/components/elements/TitledGreyBox", () => ({
  default: ({ title, children }: any) => (
    <div data-testid="titled-grey-box">
      <div>{title}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("@/components/elements/InputSpinner", () => ({
  default: ({ visible, children }: any) => (
    <div data-testid="input-spinner" data-visible={visible}>
      {children}
    </div>
  ),
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
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("updates text variable on keyUp after debounce and mutates cache", async () => {
    const updatedVar = { ...baseVariable, serverValue: "1.21.0" };
    vi.mocked(updateStartupVariable).mockResolvedValueOnce([
      updatedVar,
      "java -jar server.jar",
    ]);

    render(
      <Wrapper>
        <VariableBox variable={baseVariable} />
      </Wrapper>,
    );

    const input = screen.getByDisplayValue("1.20.4") as HTMLInputElement;
    input.value = "1.21.0";
    fireEvent.keyUp(input);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(updateStartupVariable).toHaveBeenCalledWith(
      "server-startup-uuid",
      "SERVER_VERSION",
      "1.21.0",
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockMutate).toHaveBeenCalled();
    const mutateCallback = mockMutate.mock.calls[0][0];
    const initialCache = {
      invocation: "old",
      variables: [baseVariable, { ...baseVariable, envVariable: "OTHER" }],
    };
    const newCache = mutateCallback(initialCache);
    expect(newCache.invocation).toBe("java -jar server.jar");
    expect(newCache.variables[0].serverValue).toBe("1.21.0");
  });

  it("renders Switch and toggles integer boolean (0/1)", async () => {
    const booleanVariable: ServerEggVariable = {
      name: "Auto Update",
      description: "Automatically update on restart",
      envVariable: "AUTO_UPDATE",
      defaultValue: "1",
      serverValue: "1",
      isEditable: true,
      rules: ["in:0,1"],
    };

    vi.mocked(updateStartupVariable).mockResolvedValueOnce([
      { ...booleanVariable, serverValue: "0" },
      "command",
    ]);

    render(
      <Wrapper>
        <VariableBox variable={booleanVariable} />
      </Wrapper>,
    );

    const switchElement = screen.getByRole("switch");
    expect(switchElement.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(switchElement);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(updateStartupVariable).toHaveBeenCalledWith(
      "server-startup-uuid",
      "AUTO_UPDATE",
      "0",
    );
  });

  it("renders Switch and toggles string boolean ('true'/'false')", async () => {
    const stringBoolVariable: ServerEggVariable = {
      name: "EULA Accept",
      description: "Accept EULA",
      envVariable: "EULA",
      defaultValue: "false",
      serverValue: "false",
      isEditable: true,
      rules: ["boolean", "string"],
    };

    vi.mocked(updateStartupVariable).mockResolvedValueOnce([
      { ...stringBoolVariable, serverValue: "true" },
      "command",
    ]);

    render(
      <Wrapper>
        <VariableBox variable={stringBoolVariable} />
      </Wrapper>,
    );

    const switchElement = screen.getByRole("switch");
    expect(switchElement.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(switchElement);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(updateStartupVariable).toHaveBeenCalledWith(
      "server-startup-uuid",
      "EULA",
      "true",
    );
  });

  it("renders Select dropdown and updates on change", async () => {
    const selectVariable: ServerEggVariable = {
      name: "Difficulty",
      description: "Game difficulty level",
      envVariable: "DIFFICULTY",
      defaultValue: "normal",
      serverValue: "hard",
      isEditable: true,
      rules: ["in:peaceful,easy,normal,hard"],
    };

    vi.mocked(updateStartupVariable).mockResolvedValueOnce([
      { ...selectVariable, serverValue: "easy" },
      "command",
    ]);

    const { container } = render(
      <Wrapper>
        <VariableBox variable={selectVariable} />
      </Wrapper>,
    );

    const select = container.querySelector("select")!;
    expect(select.value).toBe("hard");

    fireEvent.change(select, { target: { value: "easy" } });

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(updateStartupVariable).toHaveBeenCalledWith(
      "server-startup-uuid",
      "DIFFICULTY",
      "easy",
    );
  });

  it("handles update failure and renders HTTP error flash", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(updateStartupVariable).mockRejectedValueOnce(
      new Error("Network Error"),
    );

    render(
      <Wrapper>
        <VariableBox variable={baseVariable} />
      </Wrapper>,
    );

    const input = screen.getByDisplayValue("1.20.4") as HTMLInputElement;
    input.value = "1.21.0";
    fireEvent.keyUp(input);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockClearAndAddHttpError).toHaveBeenCalledWith({
      error: expect.any(Error),
      key: "server:startup:SERVER_VERSION",
    });
    consoleSpy.mockRestore();
  });

  it("does not update variable when user lacks permission", () => {
    render(
      <Wrapper permissions={[]}>
        <VariableBox variable={baseVariable} />
      </Wrapper>,
    );

    const input = screen.getByDisplayValue("1.20.4") as HTMLInputElement;
    expect(input.readOnly).toBe(true);

    fireEvent.keyUp(input, { currentTarget: { value: "attempt" } });

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(updateStartupVariable).not.toHaveBeenCalled();
  });

  it("toggles integer boolean from 0 to 1", async () => {
    const booleanVariable: ServerEggVariable = {
      name: "Auto Update",
      description: "Automatically update on restart",
      envVariable: "AUTO_UPDATE",
      defaultValue: "0",
      serverValue: "0",
      isEditable: true,
      rules: ["in:0,1"],
    };

    vi.mocked(updateStartupVariable).mockResolvedValueOnce([
      { ...booleanVariable, serverValue: "1" },
      "command",
    ]);

    render(
      <Wrapper>
        <VariableBox variable={booleanVariable} />
      </Wrapper>,
    );

    const switchElement = screen.getByRole("switch");
    fireEvent.click(switchElement);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(updateStartupVariable).toHaveBeenCalledWith(
      "server-startup-uuid",
      "AUTO_UPDATE",
      "1",
    );
  });

  it("toggles string boolean from true to false", async () => {
    const stringBoolVariable: ServerEggVariable = {
      name: "EULA Accept",
      description: "Accept EULA",
      envVariable: "EULA",
      defaultValue: "true",
      serverValue: "true",
      isEditable: true,
      rules: ["boolean", "string"],
    };

    vi.mocked(updateStartupVariable).mockResolvedValueOnce([
      { ...stringBoolVariable, serverValue: "false" },
      "command",
    ]);

    render(
      <Wrapper>
        <VariableBox variable={stringBoolVariable} />
      </Wrapper>,
    );

    const switchElement = screen.getByRole("switch");
    fireEvent.click(switchElement);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(updateStartupVariable).toHaveBeenCalledWith(
      "server-startup-uuid",
      "EULA",
      "false",
    );
  });

  it("does not toggle switch when readOnly or not editable", () => {
    const booleanVariable: ServerEggVariable = {
      name: "Auto Update",
      description: "Automatically update on restart",
      envVariable: "AUTO_UPDATE",
      defaultValue: "1",
      serverValue: "1",
      isEditable: false,
      rules: ["in:0,1"],
    };

    render(
      <Wrapper permissions={[]}>
        <VariableBox variable={booleanVariable} />
      </Wrapper>,
    );

    const switchElement = screen.getByRole("switch");
    fireEvent.click(switchElement);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(updateStartupVariable).not.toHaveBeenCalled();
  });

  it("renders select with fallback defaultValue when serverValue is null", () => {
    const selectVariable: ServerEggVariable = {
      name: "Difficulty",
      description: "Game difficulty level",
      envVariable: "DIFFICULTY",
      defaultValue: "peaceful",
      serverValue: null as any,
      isEditable: true,
      rules: ["in:peaceful,easy,normal,hard"],
    };

    const { container } = render(
      <Wrapper>
        <VariableBox variable={selectVariable} />
      </Wrapper>,
    );

    const select = container.querySelector("select")!;
    expect(select.value).toBe("peaceful");
  });

  it("renders text input with empty fallback when serverValue is null", () => {
    const textVariable: ServerEggVariable = {
      ...baseVariable,
      serverValue: null as any,
    };

    render(
      <Wrapper>
        <VariableBox variable={textVariable} />
      </Wrapper>,
    );

    const input = screen.getByPlaceholderText("latest") as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("handles cache mutate when data.variables is undefined", async () => {
    vi.mocked(updateStartupVariable).mockResolvedValueOnce([
      baseVariable,
      "java -jar server.jar",
    ]);

    render(
      <Wrapper>
        <VariableBox variable={baseVariable} />
      </Wrapper>,
    );

    const input = screen.getByDisplayValue("1.20.4") as HTMLInputElement;
    fireEvent.keyUp(input);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    await act(async () => {
      await Promise.resolve();
    });

    const mutateCallback = mockMutate.mock.calls[0][0];
    const newCache = mutateCallback({ invocation: "old" });
    expect(newCache.variables).toEqual([]);
  });
});
