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

import BeforeContent from "@blueprint/components/Dashboard/Serverlist/BeforeContent";
import AfterContent from "@blueprint/components/Dashboard/Serverlist/AfterContent";

export default () => {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const defaultPage = Number(params.get("page") || "1");
  const [page, setPage] = useState(
    Number.isInteger(defaultPage) && defaultPage > 0 ? defaultPage : 1,
  );
  const [searchText, setSearchText] = useState(params.get("q") || "");
  const [query, setQuery] = useState(searchText.trim());
  const [, startTransition] = useTransition();
  const { clearFlashes, clearAndAddHttpError } = useFlash();
  const uuid = useAppStore((state) => state.user.data!.uuid);
  const rootAdmin = useAppStore((state) => state.user.data!.rootAdmin);
  const [showOnlyAdmin, setShowOnlyAdmin] = usePersistedState(
    uuid + ":show_all_servers",
    false,
  );

  const {
    data: servers,
    error,
    mutate,
    isValidating,
  } = useTanStackQuery<PaginatedResult<Server>>(
    ["/api/client/servers", showOnlyAdmin && rootAdmin, page, query],
    () =>
      getServers({
        page,
        query: query || undefined,
        type: showOnlyAdmin && rootAdmin ? "admin" : undefined,
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
    const suffix = params.toString();
    window.history.replaceState(
      null,
      document.title,
      "/" + (suffix ? "?" + suffix : ""),
    );
  }, [page, query]);

  useEffect(() => {
    if (error) clearAndAddHttpError({ key: "dashboard", error });
    else clearFlashes("dashboard");
  }, [error]);

  const changeScope = (otherServers: boolean) => {
    setShowOnlyAdmin(otherServers);
    setPage(1);
  };

  return (
    <PageContentBlock
      title={"Servers"}
      includeAppUrl
      showFlashKey={"dashboard"}
    >
      <BeforeContent />
      <div className={"page-heading"}>
        <div>
          <p className={"page-eyebrow"}>Your workspace</p>
          <div className={"page-title-line"}>
            <h1 className={"page-title"}>Servers</h1>
            {servers && (
              <span className={"server-count"}>{servers.pagination.total}</span>
            )}
          </div>
          <p className={"page-description"}>
            Your game servers, all in one place. Select a server to get started.
          </p>
        </div>
        {rootAdmin && (
          <a href={"/admin/servers"} className={"panel-link-button"}>
            <Plus size={16} aria-hidden /> Manage servers
          </a>
        )}
      </div>
      <div className={"server-toolbar"}>
        {rootAdmin ? (
          <div
            className={"server-scope"}
            role={"group"}
            aria-label={"Server ownership"}
          >
            <button
              type={"button"}
              aria-pressed={!showOnlyAdmin}
              onClick={() => changeScope(false)}
            >
              Your servers
            </button>
            <button
              type={"button"}
              aria-pressed={showOnlyAdmin}
              onClick={() => changeScope(true)}
            >
              Other servers
            </button>
          </div>
        ) : (
          <span className={"toolbar-label"}>Your servers</span>
        )}
        <div className={"server-search"}>
          <Search size={17} aria-hidden />
          <input
            type={"search"}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            aria-label={"Search servers"}
            placeholder={"Search servers…"}
          />
          {searchText && (
            <button
              type={"button"}
              aria-label={"Clear search"}
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
          aria-label={"Refresh servers"}
          title={"Refresh servers"}
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
      <div className={"server-results"} aria-busy={isValidating}>
        {error && !servers ? (
          <div className={"server-empty"}>
            <h2>Unable to load your servers</h2>
            <p>Try refreshing the list in a moment.</p>
            <button
              type={"button"}
              className={"panel-link-button"}
              onClick={() => mutate()}
            >
              <RefreshCw size={16} aria-hidden /> Try again
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
                    <ServerRow key={server.uuid} server={server} />
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
                      ? "No matching servers"
                      : showOnlyAdmin
                        ? "No other servers"
                        : "No servers yet"}
                  </h2>
                  <p>
                    {query
                      ? "We couldn’t find a server matching “" +
                        query +
                        "”. Try a different name or address."
                      : showOnlyAdmin
                        ? "Servers belonging to other users will appear here."
                        : rootAdmin
                          ? "Create a server in the admin panel, or assign an existing server to your account."
                          : "When a server is assigned to your account, you’ll find it here. Contact your administrator to get started."}
                  </p>
                  {query ? (
                    <button
                      type={"button"}
                      className={"panel-link-button"}
                      onClick={() => setSearchText("")}
                    >
                      Clear search <X size={15} aria-hidden />
                    </button>
                  ) : rootAdmin ? (
                    <a
                      href={"/admin/servers"}
                      className={"panel-link-button panel-link-primary"}
                    >
                      Open server management{" "}
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
