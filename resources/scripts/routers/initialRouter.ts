import type { ComponentType } from "react";

export interface InitialRouter {
  kind: "auth" | "server" | "dashboard";
  Component: ComponentType;
}

// Resolve only the requested shell before mounting App. The initial screen
// can then render immediately without a lazy/Suspense reveal delay; subsequent
// route changes retain the normal lazy loading and error boundaries.
export const loadInitialRouter = async (
  pathname: string,
): Promise<InitialRouter> => {
  if (pathname.startsWith("/auth/")) {
    return {
      kind: "auth",
      Component: (await import("./AuthenticationRouter")).default,
    };
  }
  if (pathname.startsWith("/server/")) {
    return {
      kind: "server",
      Component: (await import("./ServerRouter")).default,
    };
  }
  return {
    kind: "dashboard",
    Component: (await import("./DashboardRouter")).default,
  };
};
