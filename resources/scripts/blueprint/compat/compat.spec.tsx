import React from "react";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { Formik, Form } from "formik";
import {
  MemoryRouter,
  Routes,
  Route as ModernRoute,
  useLocation,
  useNavigationType,
} from "react-router";
import * as legacy from "./router";
import { useStore, useStoreActions, useStoreState } from "./store";
import { appStore, store } from "@/state";
import Field from "./Field";
import { COMPATIBILITY_API_VERSION } from "./index";

const navigate = vi.fn();
vi.mock("react-router", async (original) => ({
  ...(await original<any>()),
  useNavigate: () => navigate,
}));

beforeEach(() => {
  navigate.mockClear();
  appStore.getState().flashes.clearFlashes();
});

it("reads and updates the same application store through legacy hooks", () => {
  expect(COMPATIBILITY_API_VERSION).toBe(1);
  const { result } = renderHook(() => ({
    messages: useStoreState((state) => state.flashes.items),
    add: useStoreActions((actions) => actions.flashes.addError),
    store: useStore(),
  }));
  expect(result.current.store).toBe(store);
  act(() =>
    result.current.add({ message: "Legacy addon error", key: "legacy" }),
  );
  expect(result.current.messages[0].message).toBe("Legacy addon error");
  expect(appStore.getState().flashes.items).toEqual(result.current.messages);
});

it("registers an old Field with Formik and displays validation after blur", async () => {
  const submit = vi.fn();
  render(
    <Formik
      initialValues={{ name: "" }}
      validate={(values) => (values.name ? {} : { name: "required" })}
      onSubmit={submit}
    >
      <Form>
        <Field name="name" label="Name" description="Server name" />
        <button type="submit">Save</button>
      </Form>
    </Formik>,
  );
  const input = screen.getByLabelText("Name");
  expect(screen.getByText("Server name")).toBeTruthy();
  fireEvent.blur(input);
  await screen.findByText("Required");
  expect(input.getAttribute("aria-invalid")).toBe("true");
  fireEvent.change(input, { target: { value: "Paper" } });
  fireEvent.click(screen.getByText("Save"));
  await waitFor(() =>
    expect(submit).toHaveBeenCalledWith({ name: "Paper" }, expect.anything()),
  );
});

it("matches v5 path arrays, prefixes, exact and case sensitive routes", () => {
  expect(legacy.matchPath("/server/abc/files", "/server/:id")).toEqual({
    path: "/server/:id",
    url: "/server/abc",
    isExact: false,
    params: { id: "abc" },
  });
  expect(
    legacy.matchPath("/server/abc", {
      path: ["/other", "/server/:id"],
      exact: true,
    })?.isExact,
  ).toBe(true);
  expect(
    legacy.matchPath("/Server/abc", { path: "/server/:id", sensitive: true }),
  ).toBeNull();
  expect(
    legacy.matchPath("/server/abc/files", { path: "/server/:id", exact: true }),
  ).toBeNull();
});

it("adapts push, replace, state and history traversal", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={["/initial"]}>{children}</MemoryRouter>
  );
  const { result } = renderHook(legacy.useHistory, { wrapper });
  expect(result.current.location.pathname).toBe("/initial");
  result.current.push("/one", { from: "legacy" });
  result.current.replace({ pathname: "/two", state: "object" });
  result.current.push({ pathname: "/three" }, "argument");
  result.current.goBack();
  result.current.goForward();
  result.current.go(-2);
  expect(navigate.mock.calls).toEqual([
    ["/one", { state: { from: "legacy" }, replace: false }],
    [
      { pathname: "/two", state: "object" },
      { state: "object", replace: true },
    ],
    [{ pathname: "/three" }, { state: "argument", replace: false }],
    [-1],
    [1],
    [-2],
  ]);
});

it("gets parent route matches and returns null outside matched routes", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={["/server/abc"]}>{children}</MemoryRouter>
  );
  const { result } = renderHook(
    () => [legacy.useRouteMatch(), legacy.useRouteMatch("/other")],
    { wrapper },
  );
  expect(result.current).toEqual([
    { path: "/", url: "/", isExact: false, params: {} },
    null,
  ]);
  function Probe() {
    const match = legacy.useRouteMatch();
    return <pre>{JSON.stringify(match)}</pre>;
  }
  const view = render(
    <MemoryRouter initialEntries={["/server/abc"]}>
      <Routes>
        <ModernRoute path="/server/:id" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(view.container.textContent).toContain('"url":"/server/abc"');
  expect(view.container.textContent).toContain('"id":"abc"');
  view.unmount();
  render(
    <MemoryRouter>
      <Routes>
        <ModernRoute element={<Probe />}>
          <ModernRoute index element={<span />} />
        </ModernRoute>
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText(/"path":"\/"/)).toBeTruthy();
});

it("supplies legacy match and params to nested route components", () => {
  function Child({ match, location }: any) {
    const contextual = legacy.useRouteMatch();
    const params = legacy.useParams<{ child: string }>();
    return (
      <span>
        {match.url}|{location.pathname}|{contextual?.path}|{params.child}
      </span>
    );
  }
  render(
    <MemoryRouter initialEntries={["/plugin/test"]}>
      <legacy.Route path="/plugin/:child" component={Child} />
    </MemoryRouter>,
  );
  expect(
    screen.getByText("/plugin/test|/plugin/test|/plugin/:child|test"),
  ).toBeTruthy();
});

it("supports first-match switching, render props and fallback children", () => {
  const view = render(
    <MemoryRouter initialEntries={["/plugin"]}>
      <legacy.Switch>
        {false}
        <legacy.Route path="/missing">Hidden</legacy.Route>
        <legacy.Route
          path="/plugin"
          exact
          render={({ match }) => <span>{match.url}</span>}
        />
        <legacy.Route>Fallback</legacy.Route>
      </legacy.Switch>
    </MemoryRouter>,
  );
  expect(screen.getByText("/plugin")).toBeTruthy();
  expect(screen.queryByText("Fallback")).toBeNull();
  view.unmount();
  render(
    <MemoryRouter>
      <legacy.Switch>
        <legacy.Route path="/missing">Hidden</legacy.Route>
        <legacy.Route>Fallback</legacy.Route>
      </legacy.Switch>
    </MemoryRouter>,
  );
  expect(screen.getByText("Fallback")).toBeTruthy();
  render(
    <MemoryRouter>
      <legacy.Switch>
        <legacy.Route path="/missing" />
      </legacy.Switch>
    </MemoryRouter>,
  );
});

it("renders matching children and calls function children for unmatched routes", () => {
  render(
    <MemoryRouter initialEntries={["/yes"]}>
      <legacy.Route path="/yes">Matching</legacy.Route>
      <legacy.Route path="/no">Hidden</legacy.Route>
      <legacy.Route path="/no">
        {({ match }: any) => (
          <span>{match === null ? "Unmatched callback" : "unexpected"}</span>
        )}
      </legacy.Route>
    </MemoryRouter>,
  );
  expect(screen.getByText("Matching")).toBeTruthy();
  expect(screen.getByText("Unmatched callback")).toBeTruthy();
  expect(screen.queryByText("Hidden")).toBeNull();
});

it("preserves v5 active link styles and redirect replace behavior", () => {
  render(
    <MemoryRouter initialEntries={["/active"]}>
      <legacy.NavLink
        to="/active"
        exact
        activeClassName="selected"
        activeStyle={{ color: "red" }}
        className="link"
        style={{ padding: 2 }}
      >
        Active
      </legacy.NavLink>
      <legacy.NavLink to="/missing">Inactive</legacy.NavLink>
      <legacy.NavLink to="/active">Default active</legacy.NavLink>
    </MemoryRouter>,
  );
  expect(screen.getByText("Active").className).toBe("link selected");
  expect(screen.getByText("Active").style.color).toBe("red");
  expect(screen.getByText("Inactive").className).toBe("");
  expect(screen.getByText("Default active").className).toBe("active");
});

it.each([
  [false, "REPLACE"],
  [true, "PUSH"],
])("redirects through the current router (push=%s)", (push, action) => {
  function Destination() {
    return (
      <span>
        {useLocation().pathname}:{useNavigationType()}
      </span>
    );
  }
  render(
    <MemoryRouter initialEntries={["/old"]}>
      <Routes>
        <ModernRoute
          path="/old"
          element={
            push ? (
              <legacy.Redirect to="/new" push />
            ) : (
              <legacy.Redirect to="/new" />
            )
          }
        />
        <ModernRoute path="/new" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText(`/new:${action}`)).toBeTruthy();
});
