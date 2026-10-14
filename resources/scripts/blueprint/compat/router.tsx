import React, { createContext, useContext } from "react";
import {
  matchPath as modernMatchPath,
  useLocation,
  useNavigate,
  useParams as modernUseParams,
  UNSAFE_RouteContext,
  Navigate,
  NavLink as ModernNavLink,
  type NavLinkProps,
  type To,
} from "react-router";

export * from "react-router";

type Match = {
  path: string;
  url: string;
  isExact: boolean;
  params: Record<string, string | undefined>;
};
type MatchOptions = {
  path: string | string[];
  exact?: boolean;
  sensitive?: boolean;
};
const LegacyMatchContext = createContext<Match | null>(null);

export function matchPath(
  pathname: string,
  options: string | MatchOptions,
): Match | null {
  const config = typeof options === "string" ? { path: options } : options;
  const paths = Array.isArray(config.path) ? config.path : [config.path];
  for (const path of paths) {
    const match = modernMatchPath(
      { path, end: config.exact ?? false, caseSensitive: config.sensitive },
      pathname,
    );
    if (match)
      return {
        path,
        url: match.pathname,
        isExact: match.pathname === pathname,
        params: match.params,
      };
  }
  return null;
}

export function useRouteMatch(options?: string | MatchOptions): Match | null {
  const location = useLocation();
  const legacy = useContext(LegacyMatchContext);
  const { matches } = useContext(UNSAFE_RouteContext);
  if (options) return matchPath(location.pathname, options);
  if (legacy) return legacy;
  const match = matches.at(-1);
  return match
    ? {
        path: match.route.path || "/",
        url: match.pathnameBase,
        isExact: match.pathnameBase === location.pathname,
        params: match.params,
      }
    : { path: "/", url: "/", isExact: location.pathname === "/", params: {} };
}

export function useParams<T extends Record<string, string | undefined>>() {
  const params = modernUseParams();
  const match = useContext(LegacyMatchContext);
  return { ...params, ...match?.params } as T;
}

export function useHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const visit = (
    to: To & { state?: unknown },
    state: unknown,
    replace: boolean,
  ) =>
    navigate(to, {
      state: typeof to === "object" ? (to.state ?? state) : state,
      replace,
    });
  return {
    location,
    push: (to: To & { state?: unknown }, state?: unknown) =>
      visit(to, state, false),
    replace: (to: To & { state?: unknown }, state?: unknown) =>
      visit(to, state, true),
    go: (delta: number) => navigate(delta),
    goBack: () => navigate(-1),
    goForward: () => navigate(1),
  };
}

type RouteProps = {
  path?: string | string[];
  exact?: boolean;
  sensitive?: boolean;
  component?: React.ComponentType<any>;
  render?: (props: any) => React.ReactNode;
  children?: React.ReactNode | ((props: any) => React.ReactNode);
};
export function Route({
  path,
  exact,
  sensitive,
  component: Component,
  render,
  children,
}: RouteProps) {
  const location = useLocation();
  const history = useHistory();
  const parent = useRouteMatch();
  const match = path
    ? matchPath(location.pathname, { path, exact, sensitive })
    : parent;
  const props = { match, location, history };
  const content =
    typeof children === "function" ? (
      children(props)
    ) : !match ? null : Component ? (
      <Component {...props} />
    ) : render ? (
      render(props)
    ) : (
      children
    );
  return (
    <LegacyMatchContext.Provider value={match}>
      {content}
    </LegacyMatchContext.Provider>
  );
}

export function Switch({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    React.Children.toArray(children).find(
      (child) =>
        React.isValidElement<RouteProps>(child) &&
        (!child.props.path ||
          matchPath(location.pathname, {
            path: child.props.path,
            exact: child.props.exact,
            sensitive: child.props.sensitive,
          })),
    ) || null
  );
}

export function Redirect({ to, push = false }: { to: To; push?: boolean }) {
  return <Navigate to={to} replace={!push} />;
}

type LegacyNavLinkProps = Omit<NavLinkProps, "className" | "style"> & {
  exact?: boolean;
  activeClassName?: string;
  activeStyle?: React.CSSProperties;
  className?: string;
  style?: React.CSSProperties;
};
export function NavLink({
  exact,
  activeClassName = "active",
  activeStyle,
  className = "",
  style,
  ...props
}: LegacyNavLinkProps) {
  return (
    <ModernNavLink
      {...props}
      end={exact}
      className={({ isActive }) =>
        `${className} ${isActive ? activeClassName : ""}`.trim()
      }
      style={({ isActive }) => ({
        ...style,
        ...(isActive ? activeStyle : undefined),
      })}
    />
  );
}
