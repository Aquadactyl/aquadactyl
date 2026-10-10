import React from "react";
import { NavLink, Route, Routes, useLocation } from "react-router";
import { NotFound } from "@/components/elements/ScreenBlock";
import TransitionRouter from "@/TransitionRouter";
import DashboardContainer from "@/components/dashboard/DashboardContainer";
import Spinner from "@/components/elements/Spinner";
import { useAppStore } from "@/state";

import routes from "@/routers/routes";
import blueprintRoutes from "./routes";
import { UiBadge } from "@blueprint/ui";

export const NavigationLinks = () => {
  const rootAdmin = useAppStore((state) => state.user.data!.rootAdmin);
  return (
    <>
      {/* Aquadactyl routes */}
      {routes.account
        .filter((route) => !!route.name)
        .map(({ path, name, exact = false }) => (
          <NavLink
            key={path}
            to={`/account/${path}`.replace("//", "/")}
            end={exact}
          >
            {name}
          </NavLink>
        ))}

      {/* Blueprint routes */}
      {blueprintRoutes.account.length > 0 &&
        blueprintRoutes.account
          .filter((route) => !!route.name)
          .filter((route) => (route.adminOnly ? rootAdmin : true))
          .map(({ path, name, exact = false, adminOnly }) => (
            <NavLink
              key={path}
              to={`/account/${path}`.replace("//", "/")}
              end={exact}
            >
              {name}
              {adminOnly ? (
                <>
                  <span className={"hidden"}>(</span>
                  <UiBadge>ADMIN</UiBadge>
                  <span className={"hidden"}>)</span>
                </>
              ) : undefined}
            </NavLink>
          ))}
    </>
  );
};

export const NavigationRouter = () => {
  const location = useLocation();
  const deferredLocation = React.useDeferredValue(location);
  const rootAdmin = useAppStore((state) => state.user.data!.rootAdmin);
  return (
    <>
      <TransitionRouter location={deferredLocation}>
        <React.Suspense fallback={<Spinner centered />}>
          <Routes location={deferredLocation}>
            <Route path={"/"} element={<DashboardContainer />} />

            {/* Aquadactyl routes */}
            {routes.account.map(({ path, component: Component }) => (
              <Route
                key={path}
                path={`account/${path.replace(/^\/+/, "")}`}
                element={<Component />}
              />
            ))}

            {/* Blueprint routes */}
            {blueprintRoutes.account.length > 0 &&
              blueprintRoutes.account
                .filter((route) => (route.adminOnly ? rootAdmin : true))
                .map(({ path, component: Component }) => (
                  <Route
                    key={path}
                    path={`account/${path.replace(/^\/+/, "")}`}
                    element={<Component />}
                  />
                ))}

            <Route path={"*"} element={<NotFound />} />
          </Routes>
        </React.Suspense>
      </TransitionRouter>
    </>
  );
};
