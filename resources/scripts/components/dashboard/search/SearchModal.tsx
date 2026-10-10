import SensitiveValue from "@/components/elements/SensitiveValue";
import React, { useEffect, useRef, useState, useTransition } from "react";
import Modal, { RequiredModalProps } from "@/components/elements/Modal";
import { useForm, useWatch } from "react-hook-form";
import debounce from "debounce";
import InputSpinner from "@/components/elements/InputSpinner";
import getServers from "@/api/getServers";
import { Server } from "@/api/server/getServer";
import { useAppStore } from "@/state";
import useFlash from "@/plugins/useFlash";
import { Link } from "react-router";
import Input from "@/components/elements/Input";
import Label from "@/components/elements/Label";
import { ip } from "@/lib/formatters";

type Props = RequiredModalProps;

interface Values {
  term: string;
}

export default ({ ...props }: Props) => {
  const ref = useRef<HTMLInputElement>(null);
  const isAdmin = useAppStore((state) => state.user.data!.rootAdmin);
  const [servers, setServers] = useState<Server[]>([]);
  const [searching, setSearching] = useState(false);
  const [, startTransition] = useTransition();
  const { clearAndAddHttpError, clearFlashes } = useFlash();

  const { register, control, reset } = useForm<Values>({
    defaultValues: { term: "" },
  });

  const term = useWatch({ control, name: "term" });

  const executeSearch = useRef(
    debounce((query: string) => {
      clearFlashes("search");
      setSearching(true);

      getServers({ query, type: isAdmin ? "admin-all" : undefined })
        .then((result) => {
          startTransition(() => {
            setServers(result.items.filter((_, index) => index < 5));
          });
        })
        .catch((error) => {
          console.error(error);
          clearAndAddHttpError({ key: "search", error });
        })
        .finally(() => {
          setSearching(false);
          ref.current?.focus();
        });
    }, 500),
  ).current;

  useEffect(() => {
    if (term && term.length >= 3) {
      executeSearch(term);
    } else {
      setServers([]);
      setSearching(false);
    }
  }, [term, executeSearch]);

  useEffect(() => {
    if (props.visible) {
      ref.current?.focus();
    } else {
      reset({ term: "" });
      setServers([]);
      setSearching(false);
    }
  }, [props.visible, reset]);

  const { ref: registerRef, ...registerProps } = register("term");

  return (
    <Modal {...props}>
      <form onSubmit={(e) => e.preventDefault()}>
        <div>
          <Label htmlFor={"search-term"}>Search term</Label>
          <InputSpinner visible={searching}>
            <Input
              id={"search-term"}
              autoFocus
              {...registerProps}
              ref={(e) => {
                registerRef(e);
                ref.current = e;
              }}
            />
          </InputSpinner>
          <p id={"search-term-help"} className={"input-help"}>
            Enter a server name, uuid, or allocation to begin searching.
          </p>
        </div>
      </form>
      {servers.length > 0 && (
        <div className={"mt-6"}>
          {servers.map((server) => (
            <Link
              key={server.uuid}
              to={`/server/${server.id}`}
              onClick={() => props.onDismissed()}
              className={
                "flex items-center rounded border-l-4 border-neutral-900 bg-neutral-900 p-4 no-underline transition-all duration-150 not-last-of-type:mb-2 hover:border-cyan-500 hover:shadow-sm"
              }
            >
              <div className={"mr-4 flex-1"}>
                <p className={"text-sm"}>{server.name}</p>
                <p className={"mt-1 text-xs text-neutral-400"}>
                  {server.allocations
                    .filter((alloc) => alloc.isDefault)
                    .map((allocation) => (
                      <span
                        key={allocation.ip + allocation.port.toString()}
                      >
                        <SensitiveValue>
                          {allocation.alias || ip(allocation.ip)}:
                          {allocation.port}
                        </SensitiveValue>
                      </span>
                    ))}
                </p>
              </div>
              <div className={"flex-none text-right"}>
                <span
                  className={
                    "rounded bg-cyan-800 px-2 py-1 text-xs text-cyan-100"
                  }
                >
                  {server.node}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Modal>
  );
};
