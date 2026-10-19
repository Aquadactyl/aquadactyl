import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import http, { httpErrorToHuman } from "@/api/http";
import { ServerContext } from "@/state/server";
import TitledGreyBox from "@/components/elements/TitledGreyBox";
import Input from "@/components/elements/Input";
import Label from "@/components/elements/Label";
import Select from "@/components/elements/Select";
import { Button } from "@/components/elements/button/index";
import CopyOnClick from "@/components/elements/CopyOnClick";
import usePanelTranslation from "@/plugins/usePanelTranslation";

interface Subdomains {
  domains: { id: number; domain: string }[];
  subdomain: {
    hostname: string;
    status: string;
    minecraft_srv: boolean;
    port: number;
  } | null;
}

export default function SubdomainBox() {
  const { t } = usePanelTranslation();
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const endpoint = `/api/client/servers/${uuid}/settings/subdomain`;
  const [label, setLabel] = useState("");
  const [domain, setDomain] = useState("");
  const [srv, setSrv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery<Subdomains>({
    queryKey: ["server-subdomain", uuid],
    queryFn: async () => (await http.get(endpoint)).data,
    refetchInterval: (query) =>
      query.state.data?.subdomain &&
      ["pending", "deleting"].includes(query.state.data.subdomain.status)
        ? 3000
        : false,
    retry: false,
  });
  const data = query.data;
  if (!data || !data.domains.length) return null;
  const current = data.subdomain;
  const address = current
    ? current.hostname + (current.minecraft_srv ? "" : `:${current.port}`)
    : "";
  const change = async (remove: boolean) => {
    setBusy(true);
    setError("");
    try {
      if (remove) await http.delete(endpoint);
      else
        await http.post(endpoint, {
          domain_id: Number(domain || data.domains[0].id),
          label,
          minecraft_srv: srv,
        });
      await query.refetch();
    } catch (error) {
      setError(httpErrorToHuman(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <TitledGreyBox
      title={t("subdomains.title", "Server subdomain")}
      className="mb-6 md:mb-10"
    >
      <p className="mb-4 text-sm text-neutral-300">
        {t(
          "subdomains.help",
          "Choose a memorable address for this server. DNS changes may take a few minutes.",
        )}
      </p>
      {current ? (
        <div className="space-y-4">
          <CopyOnClick text={address}>
            <Input
              aria-label={t("subdomains.address", "Server address")}
              value={address}
              readOnly
            />
          </CopyOnClick>
          <p role="status" className="text-sm">
            {t(`subdomains.status_${current.status}`, current.status)}
          </p>
          {current.status === "error" && (
            <p className="text-sm text-red-300">
              {t(
                "subdomains.dns_error",
                "DNS setup failed. Ask an administrator to check the Cloudflare token, public IP and existing records. It will retry automatically.",
              )}
            </p>
          )}
          <Button
            variant={Button.Variants.Secondary}
            disabled={busy || current.status === "deleting"}
            onClick={() => void change(true)}
          >
            {t("subdomains.remove", "Remove subdomain")}
          </Button>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void change(false);
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="subdomain-label">
              {t("subdomains.name", "Name")}
            </Label>
            <Input
              id="subdomain-label"
              value={label}
              onChange={(event) => setLabel(event.target.value.toLowerCase())}
              pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?"
              maxLength={63}
              placeholder="my-server"
              required
              disabled={busy}
            />
          </div>
          <div>
            <Label htmlFor="subdomain-domain">
              {t("subdomains.domain", "Domain")}
            </Label>
            <Select
              id="subdomain-domain"
              value={domain || String(data.domains[0].id)}
              onChange={(event) => setDomain(event.target.value)}
              disabled={busy}
            >
              {data.domains.map((option) => (
                <option key={option.id} value={option.id}>
                  .{option.domain}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={srv}
              onChange={(event) => setSrv(event.target.checked)}
              disabled={busy}
            />
            {t(
              "subdomains.srv",
              "Minecraft Java: connect without a port (SRV)",
            )}
          </label>
          <p className="text-xs text-neutral-400">
            {t(
              "subdomains.port_help",
              "Other games, including Bedrock, may still require the server port.",
            )}
          </p>
          <Button type="submit" disabled={busy}>
            {t("subdomains.create", "Create subdomain")}
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {error}
        </p>
      )}
    </TitledGreyBox>
  );
}
