import usePanelTranslation from "@/plugins/usePanelTranslation";
import React, { useState } from "react";
import { Link, NavLink } from "react-router";
import { Activity, ArrowUpRight, LogOut, Server, Settings } from "lucide-react";
import { useAppStore } from "@/state";
import SearchContainer from "@/components/dashboard/search/SearchContainer";
import http from "@/api/http";
import SpinnerOverlay from "@/components/elements/SpinnerOverlay";
import Tooltip from "@/components/elements/tooltip/Tooltip";
import Avatar from "@/components/Avatar";
import NotificationBell from "@/components/notifications/NotificationBell";

import BeforeNavigation from "@blueprint/components/Navigation/NavigationBar/BeforeNavigation";
import AdditionalItems from "@blueprint/components/Navigation/NavigationBar/AdditionalItems";
import AfterNavigation from "@blueprint/components/Navigation/NavigationBar/AfterNavigation";

export default () => {
  const { t } = usePanelTranslation();
  const name = useAppStore((state) => state.settings.data!.name);
  const logoUrl = useAppStore((state) => state.settings.data?.logoUrl);
  const showNameWithLogo = useAppStore(
    (state) => state.settings.data?.showNameWithLogo,
  );
  const pairedLogo = Boolean(logoUrl && showNameWithLogo);
  const user = useAppStore((state) => state.user.data!);
  const statusPage = useAppStore(
    (state) => state.settings.data?.features?.statusPage,
  );
  const isAquadactyl = name.trim().toLowerCase() === "aquadactyl";
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const onTriggerLogout = () => {
    setIsLoggingOut(true);
    http.post("/auth/logout").finally(() => window.location.assign("/"));
  };

  return (
    <header className={"panel-navigation"} id={"NavigationBar"}>
      <BeforeNavigation />
      <SpinnerOverlay visible={isLoggingOut} />
      <div className={"navigation-inner"}>
        <div
          id={"logo"}
          className={
            "navigation-brand" +
            (pairedLogo ? " navigation-brand-with-name" : "")
          }
        >
          <Link
            to={"/"}
            aria-label={t("navigation.home", "{{name}} home", { name })}
            className={pairedLogo ? "brand-with-name" : undefined}
          >
            {logoUrl ? (
              <>
                <img className={"custom-site-logo"} src={logoUrl} alt={""} />
                {showNameWithLogo && (
                  <span className={"custom-site-name"} title={name}>
                    {name}
                  </span>
                )}
              </>
            ) : isAquadactyl ? (
              <img src={"/branding/aquadactyl-wordmark.png"} alt={""} />
            ) : (
              <>
                <img
                  className={"brand-emblem"}
                  src={"/branding/aquadactyl-emblem.png"}
                  alt={""}
                />
                <span>{name}</span>
              </>
            )}
          </Link>
        </div>
        <nav
          className={"navigation-items"}
          aria-label={t("navigation.main_navigation", "Main navigation")}
        >
          <NavLink
            to={"/"}
            end
            id={"NavigationDashboard"}
            aria-label={t("navigation.servers", "Servers")}
          >
            <Server size={17} aria-hidden />
            <span>{t("navigation.servers", "Servers")}</span>
          </NavLink>
          {user.rootAdmin && (
            <a
              href={"/admin"}
              id={"NavigationAdmin"}
              aria-label={t("navigation.administration", "Administration")}
            >
              <Settings size={17} aria-hidden />
              <span>{t("navigation.admin", "Admin")}</span>
              <ArrowUpRight
                size={12}
                className={"navigation-external"}
                aria-hidden
              />
            </a>
          )}
          <AdditionalItems />
          {statusPage && (
            <a href={"/status"} id={"NavigationStatus"}>
              <Activity size={17} aria-hidden />
              <span>{t("navigation.status", "Status")}</span>
            </a>
          )}
          <SearchContainer />
          <NotificationBell />
          <NavLink
            to={"/account"}
            id={"NavigationAccount"}
            aria-label={t("navigation.account_settings", "Account settings")}
          >
            <span className={"navigation-avatar"}>
              <Avatar.User size={23} />
            </span>
            <span>{t("navigation.account", "Account")}</span>
            <span className={"navigation-username"}>{user.username}</span>
          </NavLink>
          <Tooltip
            placement={"bottom"}
            content={t("navigation.sign_out", "Sign out")}
          >
            <button
              type={"button"}
              onClick={onTriggerLogout}
              disabled={isLoggingOut}
              id={"NavigationLogout"}
              aria-label={t("navigation.sign_out", "Sign out")}
              className={"navigation-logout"}
            >
              <LogOut size={17} aria-hidden />
            </button>
          </Tooltip>
        </nav>
      </div>
      <AfterNavigation />
    </header>
  );
};
