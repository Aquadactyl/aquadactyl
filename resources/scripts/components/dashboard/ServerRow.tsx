import usePanelTranslation from "@/plugins/usePanelTranslation";
import SensitiveValue from "@/components/elements/SensitiveValue";
import React, { useEffect, useRef, useState } from "react";
import useViewportVisibility from "@/plugins/useViewportVisibility";
import { useTanStackQuery } from "@/lib/queryClient";
import CountryFlag from "@/components/elements/CountryFlag";
import ServerPlayerCount from "./ServerPlayerCount";
import ServerQuickActions from "./ServerQuickActions";
import ServerFolderSelect from "./ServerFolderSelect";
import { ServerFolder } from "@/api/serverFolders";
import {
  ArrowRight,
  Cpu,
  HardDrive,
  MapPin,
  MemoryStick,
  Network,
  Server as ServerIcon,
} from "lucide-react";
import { Link } from "react-router";
import { Server } from "@/api/server/getServer";
import getServerResourceUsage, {
  ServerStats,
} from "@/api/server/getServerResourceUsage";
import { bytesToString, ip, mbToBytes } from "@/lib/formatters";
import { useAppStore } from "@/state";

import BeforeEntryName from "@blueprint/components/Dashboard/Serverlist/ServerRow/BeforeEntryName";
import AfterEntryName from "@blueprint/components/Dashboard/Serverlist/ServerRow/AfterEntryName";
import BeforeEntryDescription from "@blueprint/components/Dashboard/Serverlist/ServerRow/BeforeEntryDescription";
import AfterEntryDescription from "@blueprint/components/Dashboard/Serverlist/ServerRow/AfterEntryDescription";
import ResourceLimits from "@blueprint/components/Dashboard/Serverlist/ServerRow/ResourceLimits";

const isAlarmState = (current: number, limit: number): boolean =>
  limit > 0 && current / mbToBytes(limit) >= 0.9;

export default ({
  server,
  className,
  folders,
}: {
  server: Server;
  className?: string;
  folders?: ServerFolder[];
}) => {
  const { t } = usePanelTranslation();
  const features = useAppStore((state) => state.settings.data?.features);
  const row = useRef<HTMLElement>(null);
  const visible = useViewportVisibility(row);
  const [powerRefreshUntil, setPowerRefreshUntil] = useState(0);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const enabled =
    !server.status && !server.isNodeUnderMaintenance && !server.isTransferring;
  const {
    data: stats,
    error,
    mutate,
  } = useTanStackQuery<ServerStats>(
    enabled ? ["server-resources", server.uuid] : null,
    () => getServerResourceUsage(server.uuid),
    {
      refetchInterval: (query) =>
        Date.now() < powerRefreshUntil ||
        query.state.data?.status === "starting" ||
        query.state.data?.status === "stopping"
          ? 2000
          : 30000,
      refetchOnWindowFocus: true,
      staleTime: 0,
      enabled: visible,
    },
  );
  const unavailable = Boolean(error);
  const isSuspended = server.status === "suspended" || !!stats?.isSuspended;
  useEffect(
    () => () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    },
    [],
  );

  const allocation = server.allocations.find(
    (allocation) => allocation.isDefault,
  );
  const address = allocation
    ? (allocation.alias || ip(allocation.ip)) + ":" + allocation.port
    : t("server_list.no_address_assigned", "No address assigned");
  const state = isSuspended
    ? "suspended"
    : server.isNodeUnderMaintenance
      ? "maintenance"
      : server.isTransferring
        ? "transferring"
        : server.status
          ? server.status
          : unavailable
            ? "unavailable"
            : stats?.status || "loading";
  const statusLabels: Record<string, string> = {
    suspended: t("server_list.suspended", "Suspended"),
    maintenance: t("server_list.maintenance", "Maintenance"),
    transferring: t("server_list.transferring", "Transferring"),
    installing: t("server_list.installing", "Installing"),
    install_failed: t("server_list.install_failed", "Install failed"),
    restoring_backup: t("server_list.restoring", "Restoring"),
    unavailable: t("server_list.unavailable", "Unavailable"),
    running: t("server_list.running", "Running"),
    offline: t("server_list.offline", "Offline"),
    starting: t("server_list.starting", "Starting"),
    stopping: t("server_list.stopping", "Stopping"),
    loading: t("server_list.connecting", "Connecting"),
  };
  const showStats =
    stats &&
    !unavailable &&
    !isSuspended &&
    !server.isNodeUnderMaintenance &&
    !server.status &&
    !server.isTransferring;
  const resources = [
    {
      label: t("server_list.cpu", "CPU"),
      icon: Cpu,
      value: showStats ? stats.cpuUsagePercent.toFixed(1) + "%" : "—",
      limit: server.limits.cpu
        ? server.limits.cpu + "%"
        : t("server_list.unlimited", "Unlimited"),
      alarm:
        !!showStats &&
        server.limits.cpu > 0 &&
        stats.cpuUsagePercent >= server.limits.cpu * 0.9,
    },
    {
      label: t("server_list.memory", "Memory"),
      icon: MemoryStick,
      value: showStats ? bytesToString(stats.memoryUsageInBytes) : "—",
      limit: server.limits.memory
        ? bytesToString(mbToBytes(server.limits.memory))
        : t("server_list.unlimited", "Unlimited"),
      alarm:
        !!showStats &&
        isAlarmState(stats.memoryUsageInBytes, server.limits.memory),
    },
    {
      label: t("server_list.disk", "Disk"),
      icon: HardDrive,
      value: showStats ? bytesToString(stats.diskUsageInBytes) : "—",
      limit: server.limits.disk
        ? bytesToString(mbToBytes(server.limits.disk))
        : t("server_list.unlimited", "Unlimited"),
      alarm:
        !!showStats && isAlarmState(stats.diskUsageInBytes, server.limits.disk),
    },
  ];

  return (
    <article
      ref={row}
      className={"server-row" + (className ? " " + className : "")}
      aria-label={t("server_list.server_name", "Server {{name}}", {
        name: server.name,
      })}
    >
      <div className={"server-identity"}>
        <div className={"server-row-icon"}>
          <ServerIcon size={20} aria-hidden />
        </div>
        <div className={"server-identity-copy"}>
          <BeforeEntryName />
          <h2 className={"server-row-name"}>
            <Link
              className={"server-card-link"}
              to={"/server/" + server.id}
              aria-label={t("server_list.open_server", "Open {{name}}", {
                name: server.name,
              })}
            >
              {server.name}
            </Link>
          </h2>
          <AfterEntryName />
          {!!server.description && (
            <div>
              <BeforeEntryDescription />
              <p className={"server-row-description"}>{server.description}</p>
              <AfterEntryDescription />
            </div>
          )}
          <Link
            to={"/server/" + server.id}
            className={"server-address"}
            aria-label={t("server_list.open_server", "Open {{name}}", {
              name: server.name,
            })}
          >
            <Network size={12} aria-hidden />
            <SensitiveValue>{address}</SensitiveValue>
          </Link>
          <div className="server-row-metadata">
            <Link
              to={"/server/" + server.id}
              className={"server-metadata"}
              aria-label={t(
                "server_list.open_node",
                "Open server on {{node}}",
                {
                  node: server.node,
                },
              )}
            >
              <span className={"server-node"}>
                <MapPin size={12} aria-hidden />
                <span>{server.node}</span>
                <CountryFlag
                  code={server.nodeCountry}
                  name={server.nodeCountryName}
                />
              </span>
              {features?.playerCounts !== false && (
                <ServerPlayerCount
                  server={server}
                  state={state}
                  active={visible}
                />
              )}
            </Link>
            {folders && (
              <ServerFolderSelect server={server} folders={folders} />
            )}
          </div>
        </div>
      </div>
      <div className={"server-resources"}>
        {resources.map(({ label, icon: Icon, value, limit, alarm }) => (
          <div
            key={label}
            className={alarm ? "server-resource-alarm" : undefined}
          >
            <span className={"server-resource-label"}>
              <Icon size={12} aria-hidden /> {label}
            </span>
            <span className={"server-resource-value"}>{value}</span>
            <span className={"server-resource-limit"}>
              {limit === t("server_list.unlimited", "Unlimited")
                ? limit
                : "of " + limit}
            </span>
          </div>
        ))}
        {showStats && <ResourceLimits />}
      </div>
      <span className={"server-state"} data-state={state}>
        {statusLabels[state] || t("server_list.unavailable", "Unavailable")}
      </span>
      <span className={"server-row-arrow"} aria-hidden>
        <ArrowRight size={16} aria-hidden />
      </span>
      {features?.serverQuickActions !== false && (
        <ServerQuickActions
          server={server}
          state={state}
          onPower={(action) => {
            setPowerRefreshUntil(Date.now() + 60000);
            mutate(
              (value) =>
                value
                  ? {
                      ...value,
                      status: action === "stop" ? "stopping" : "starting",
                    }
                  : value,
              false,
            );
          }}
          onRefresh={() => {
            if (refreshTimer.current) clearTimeout(refreshTimer.current);
            refreshTimer.current = setTimeout(() => mutate(), 1500);
          }}
        />
      )}
    </article>
  );
};
