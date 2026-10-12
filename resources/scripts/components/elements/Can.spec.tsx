import React from "react";
import { render, cleanup, act } from "@testing-library/react";
import Can from "./Can";
import { ServerContext } from "@/state/server";

describe("Can permission gate component", () => {
  afterEach(cleanup);

  const renderWithPermissions = async (
    permissions: string[],
    children: React.ReactNode,
  ) => {
    let setPerms: (p: string[]) => void = () => {};

    const Helper = () => {
      const action = ServerContext.useStoreActions(
        (actions) => actions.server.setPermissions,
      );
      React.useEffect(() => {
        setPerms = action;
      }, [action]);
      return null;
    };

    const utils = render(
      <ServerContext.Provider>
        <Helper />
        {children}
      </ServerContext.Provider>,
    );

    await act(async () => {
      setPerms(permissions);
    });

    return utils;
  };

  it("renders children when user has wildcard * permission", async () => {
    const { getByText } = await renderWithPermissions(
      ["*"],
      <Can action="control.start">
        <button>Start Server</button>
      </Can>,
    );

    expect(getByText("Start Server")).toBeDefined();
  });

  it("renders children when user has matching discrete permission", async () => {
    const { getByText, queryByText } = await renderWithPermissions(
      ["file.create"],
      <>
        <Can action="file.create">
          <span>New File Button</span>
        </Can>
        <Can action="database.create">
          <span>New Database Button</span>
        </Can>
      </>,
    );

    expect(getByText("New File Button")).toBeDefined();
    expect(queryByText("New Database Button")).toBeNull();
  });

  it("renders renderOnError fallback when permission is missing", async () => {
    const { getByText } = await renderWithPermissions(
      [],
      <Can action="settings.rename" renderOnError={<p>Access Denied</p>}>
        <button>Rename Server</button>
      </Can>,
    );

    expect(getByText("Access Denied")).toBeDefined();
  });

  it("supports matchAny flag for multiple permissions", async () => {
    const { getByText, queryByText } = await renderWithPermissions(
      ["control.start"],
      <>
        {/* matchAny: true - has control.start, so should render */}
        <Can action={["control.start", "control.stop"]} matchAny={true}>
          <span>Any Power Control</span>
        </Can>

        {/* matchAny: false - missing control.stop, so should NOT render */}
        <Can action={["control.start", "control.stop"]} matchAny={false}>
          <span>All Power Controls</span>
        </Can>
      </>,
    );

    expect(getByText("Any Power Control")).toBeDefined();
    expect(queryByText("All Power Controls")).toBeNull();
  });
});
