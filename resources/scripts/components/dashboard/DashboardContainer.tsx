import usePanelTranslation from "@/plugins/usePanelTranslation";
import React, { useEffect, useState, useTransition } from "react";
import { useLocation } from "react-router";
import {
  ArrowRight,
  Plus,
  RefreshCw,
  Search,
  Server as ServerIcon,
  X,
} from "lucide-react";
import { Server } from "@/api/server/getServer";
import getServers from "@/api/getServers";
import ServerRow from "@/components/dashboard/ServerRow";
import Spinner from "@/components/elements/Spinner";
import PageContentBlock from "@/components/elements/PageContentBlock";
import useFlash from "@/plugins/useFlash";
import { useAppStore } from "@/state";
import { usePersistedState } from "@/plugins/usePersistedState";
import { useTanStackQuery } from "@/lib/queryClient";
import { PaginatedResult } from "@/api/http";
import Pagination from "@/components/elements/Pagination";
import ServerFolderBar from "./ServerFolderBar";
import { getServerFolders, ServerFolder } from "@/api/serverFolders";

import BeforeContent from "@blueprint/components/Dashboard/Serverlist/BeforeContent";
import AfterContent from "@blueprint/components/Dashboard/Serverlist/AfterContent";

export default () => {
  const { t } = usePanelTranslation();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const foldersEnabled = useAppStore(
    (state) => state.settings.data?.features?.serverFolders !== false,
  );
  const defaultPage = Number(params.get("page") || "1");
  const [page, setPage] = useState(
    Number.isInteger(defaultPage) && defaultPage > 0 ? defaultPage : 1,
  );
  const [searchText, setSearchText] = useState(params.get("q") || "");
  const [query, setQuery] = useState(searchText.trim());
  const [storedFolder, setFolder] = useState(params.get("folder") || "all");
  const folder = foldersEnabled ? storedFolder : "all";
  const [, startTransition] = useTransition();
  const { clearFlashes, clearAndAddHttpError } = useFlash();
  const uuid = useAppStore((state) => state.user.data!.uuid);
  const rootAdmin = useAppStore((state) => state.user.data!.rootAdmin);
  const [showOnlyAdmin, setShowOnlyAdmin] = usePersistedState(
    uuid + ":show_all_servers",
    false,
  );
  const {
    data: folders,
    error: folderError,
    mutate: refreshFolders,
  } = useTanStackQuery<ServerFolder[]>(
    foldersEnabled ? ["/api/client/server-folders", uuid] : null,
    getServerFolders,
  );

  const {
    data: servers,
    error,
    mutate,
    isValidating,
  } = useTanStackQuery<PaginatedResult<Server>>(
    ["/api/client/servers", showOnlyAdmin && rootAdmin, page, query, folder],
    () =>
      getServers({
        page,
        query: query || undefined,
        type: showOnlyAdmin && rootAdmin ? "admin" : undefined,
        folder: folder === "all" ? undefined : folder,
      }),
  );

  useEffect(() => {
    if (searchText.trim() === query) return;
    const timeout = setTimeout(() => {
      startTransition(() => {
        setQuery(searchText.trim());
        setPage(1);
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchText, query]);

  useEffect(() => {
    if (servers && servers.pagination.currentPage > 1 && !servers.items.length)
      setPage(1);
  }, [servers]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (page > 1) params.set("page", String(page));
    else params.delete("page");
    if (query) params.set("q", query);
    else params.delete("q");
    if (folder !== "all") params.set("folder", folder);
    else params.delete("folder");
    const suffix = params.toString();
    window.history.replaceState(
      null,
      document.title,
      "/" + (suffix ? "?" + suffix : ""),
    );
  }, [page, query, folder]);

  useEffect(() => {
    if (error || folderError)
      clearAndAddHttpError({ key: "dashboard", error: error || folderError });
    else clearFlashes("dashboard");
  }, [error, folderError]);

  const changeScope = (otherServers: boolean) => {
    setShowOnlyAdmin(otherServers);
    setPage(1);
  };

  return (
    <PageContentBlock
      title={t("dashboard.servers", "Servers")}
      includeAppUrl
      showFlashKey={"dashboard"}
    >
      <BeforeContent />
      <div className={"page-heading"}>
        <div>
          <p className={"page-eyebrow"}>
            {t("dashboard.your_workspace", "Your workspace")}
          </p>
          <div className={"page-title-line"}>
            <h1 className={"page-title"}>
              {t("dashboard.servers", "Servers")}
            </h1>
            {servers && (
              <span className={"server-count"}>{servers.pagination.total}</span>
            )}
          </div>
          <p className={"page-description"}>
            {t(
              "dashboard.your_game_servers_all_in_one_place_select_a_server",
              "Your game servers, all in one place. Select a server to get started.",
            )}
          </p>
        </div>
        {rootAdmin && (
          <a href={"/admin/servers"} className={"panel-link-button"}>
            <Plus size={16} aria-hidden />{" "}
            {t("dashboard.manage_servers", "Manage servers")}
          </a>
        )}
      </div>
      <div className={"server-toolbar"}>
        {rootAdmin ? (
          <div
            className={"server-scope"}
            role={"group"}
            aria-label={t("dashboard.server_ownership", "Server ownership")}
          >
            <button
              type={"button"}
              aria-pressed={!showOnlyAdmin}
              onClick={() => changeScope(false)}
            >
              {t("dashboard.your_servers", "Your servers")}
            </button>
            <button
              type={"button"}
              aria-pressed={showOnlyAdmin}
              onClick={() => changeScope(true)}
            >
              {t("dashboard.other_servers", "Other servers")}
            </button>
          </div>
        ) : (
          <span className={"toolbar-label"}>
            {t("dashboard.your_servers", "Your servers")}
          </span>
        )}
        <div className={"server-search"}>
          <Search size={17} aria-hidden />
          <input
            type={"search"}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            aria-label={t("dashboard.search_servers", "Search servers")}
            placeholder={
              showOnlyAdmin && rootAdmin
                ? t(
                    "folders.owner_search",
                    "Search servers, username or email…",
                  )
                : t("dashboard.search_servers_2", "Search servers…")
            }
          />
          {searchText && (
            <button
              type={"button"}
              aria-label={t("dashboard.clear_search", "Clear search")}
              onClick={() => {
                setSearchText("");
                startTransition(() => {
                  setQuery("");
                  setPage(1);
                });
              }}
            >
              <X size={15} aria-hidden />
            </button>
          )}
        </div>
        <button
          type={"button"}
          className={"refresh-servers"}
          aria-label={t("dashboard.refresh_servers", "Refresh servers")}
          title={t("dashboard.refresh_servers", "Refresh servers")}
          disabled={isValidating}
          onClick={() => mutate()}
        >
          <RefreshCw
            size={17}
            className={isValidating ? "is-refreshing" : undefined}
            aria-hidden
          />
        </button>
      </div>
      {foldersEnabled && (
        <ServerFolderBar
          folders={folders ?? []}
          active={folder}
          onSelect={(value) => {
            setFolder(value);
            setPage(1);
          }}
          onChange={async () => {
            await refreshFolders();
            await mutate();
          }}
        />
      )}
      <div className={"server-results"} aria-busy={isValidating}>
        {error && !servers ? (
          <div className={"server-empty"}>
            <h2>
              {t(
                "dashboard.unable_to_load_your_servers",
                "Unable to load your servers",
              )}
            </h2>
            <p>
              {t(
                "dashboard.try_refreshing_the_list_in_a_moment",
                "Try refreshing the list in a moment.",
              )}
            </p>
            <button
              type={"button"}
              className={"panel-link-button"}
              onClick={() => mutate()}
            >
              <RefreshCw size={16} aria-hidden />{" "}
              {t("dashboard.try_again", "Try again")}
            </button>
          </div>
        ) : !servers ? (
          <Spinner centered size={"large"} />
        ) : (
          <Pagination data={servers} onPageSelect={setPage}>
            {({ items }) =>
              items.length > 0 ? (
                <div className={"server-list"}>
                  {items.map((server) => (
                    <ServerRow
                      key={server.uuid}
                      server={server}
                      folders={foldersEnabled ? folders : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className={"server-empty"}>
                  <div className={"empty-server-icon"}>
                    {query ? (
                      <Search size={26} aria-hidden />
                    ) : (
                      <ServerIcon size={28} aria-hidden />
                    )}
                  </div>
                  <h2>
                    {query
                      ? t(
                          "dashboard.no_matching_servers",
                          "No matching servers",
                        )
                      : folder !== "all"
                        ? t("folders.empty", "No servers in this folder")
                        : showOnlyAdmin
                          ? t("dashboard.no_other_servers", "No other servers")
                          : t("dashboard.no_servers_yet", "No servers yet")}
                  </h2>
                  <p>
                    {query
                      ? showOnlyAdmin && rootAdmin
                        ? t(
                            "folders.owner_no_matches",
                            "No servers match this search. Try a server name, address, owner username or email.",
                          )
                        : t(
                            "dashboard.no_search_matches",
                            "We couldn’t find a server matching “{{query}}”. Try a different name or address.",
                            { query },
                          )
                      : folder !== "all"
                        ? t(
                            "folders.empty_help",
                            "Choose All servers, then use a server’s folder control to organise your list.",
                          )
                        : showOnlyAdmin
                          ? t(
                              "dashboard.servers_belonging_to_other_users_will_appear_here",
                              "Servers belonging to other users will appear here.",
                            )
                          : rootAdmin
                            ? t(
                                "dashboard.create_a_server_in_the_admin_panel_or_assign_an",
                                "Create a server in the admin panel, or assign an existing server to your account.",
                              )
                            : t(
                                "dashboard.when_a_server_is_assigned_to_your_account_you_ll",
                                "When a server is assigned to your account, you’ll find it here. Contact your administrator to get started.",
                              )}
                  </p>
                  {query ? (
                    <button
                      type={"button"}
                      className={"panel-link-button"}
                      onClick={() => setSearchText("")}
                    >
                      {t("dashboard.clear_search", "Clear search")}{" "}
                      <X size={15} aria-hidden />
                    </button>
                  ) : rootAdmin ? (
                    <a
                      href={"/admin/servers"}
                      className={"panel-link-button panel-link-primary"}
                    >
                      {t(
                        "dashboard.open_server_management",
                        "Open server management",
                      )}{" "}
                      <ArrowRight size={16} aria-hidden />
                    </a>
                  ) : null}
                </div>
              )
            }
          </Pagination>
        )}
      </div>
      <AfterContent />
    </PageContentBlock>
  );
};
