import React, { lazy } from "react";
import {
  Route,
  Routes,
  unstable_HistoryRouter as HistoryRouter,
} from "react-router";
import { StoreProvider } from "@/state/hooks";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { store } from "@/state";
import { SiteSettings } from "@/state/settings";
import ProgressBar from "@/components/elements/ProgressBar";
import { NotFound } from "@/components/elements/ScreenBlock";
import { history } from "@/components/history";
import { setupInterceptors } from "@/api/interceptors";
import AuthenticatedRoute from "@/components/elements/AuthenticatedRoute";
import { ServerContext } from "@/state/server";
import "@/assets/index.css";
import Spinner from "@/components/elements/Spinner";
import PrivacyMode from "@/components/elements/PrivacyMode";

const DashboardRouter = lazy(() => import("@/routers/DashboardRouter"));
const ServerRouter = lazy(() => import("@/routers/ServerRouter"));
const AuthenticationRouter = lazy(
  () => import("@/routers/AuthenticationRouter"),
);

interface ExtendedWindow extends Window {
  SiteConfiguration?: SiteSettings;
  PterodactylUser?: {
    uuid: string;
    username: string;
    email: string;
    root_admin: boolean;
    use_totp: boolean;
    language: string;
    updated_at: string;
    created_at: string;
    avatar_url?: string | null;
    blur_sensitive_data?: boolean;
  };
}

setupInterceptors(history);

const App = () => {
  const { PterodactylUser, SiteConfiguration } = window as ExtendedWindow;
  if (PterodactylUser && !store.getState().user.data) {
    store.getActions().user.setUserData({
      uuid: PterodactylUser.uuid,
      username: PterodactylUser.username,
      email: PterodactylUser.email,
      language: PterodactylUser.language,
      rootAdmin: PterodactylUser.root_admin,
      useTotp: PterodactylUser.use_totp,
      createdAt: new Date(PterodactylUser.created_at),
      updatedAt: new Date(PterodactylUser.updated_at),
      avatarUrl: PterodactylUser.avatar_url ?? null,
      blurSensitiveData: PterodactylUser.blur_sensitive_data ?? false,
    });
  }

  if (!store.getState().settings.data) {
    store.getActions().settings.setSettings(SiteConfiguration!);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider store={store}>
        <PrivacyMode />
        <ProgressBar />
        <div className={"mx-auto w-auto"}>
          <HistoryRouter history={history} useTransitions>
            <Routes>
              <Route
                path={"/auth/*"}
                element={
                  <Spinner.Suspense>
                    <AuthenticationRouter />
                  </Spinner.Suspense>
                }
              />
              <Route
                path={"/server/:id/*"}
                element={
                  <AuthenticatedRoute>
                    <Spinner.Suspense>
                      <ServerContext.Provider>
                        <ServerRouter />
                      </ServerContext.Provider>
                    </Spinner.Suspense>
                  </AuthenticatedRoute>
                }
              />
              <Route
                path={"/*"}
                element={
                  <AuthenticatedRoute>
                    <Spinner.Suspense>
                      <DashboardRouter />
                    </Spinner.Suspense>
                  </AuthenticatedRoute>
                }
              />
              <Route path={"*"} element={<NotFound />} />
            </Routes>
          </HistoryRouter>
        </div>
      </StoreProvider>
    </QueryClientProvider>
  );
};

export default App;
