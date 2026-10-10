import SensitiveValue from "@/components/elements/SensitiveValue";
import React, { useEffect, useState } from "react";
import ContentBox from "@/components/elements/ContentBox";
import CreateApiKeyForm from "@/components/dashboard/forms/CreateApiKeyForm";
import getApiKeys, { ApiKey } from "@/api/account/getApiKeys";
import SpinnerOverlay from "@/components/elements/SpinnerOverlay";
import { Key, Trash2 } from "lucide-react";
import deleteApiKey from "@/api/account/deleteApiKey";
import FlashMessageRender from "@/components/FlashMessageRender";
import { format } from "date-fns";
import PageContentBlock from "@/components/elements/PageContentBlock";
import classNames from "classnames";
import GreyRowBox from "@/components/elements/GreyRowBox";
import { Dialog } from "@/components/elements/dialog";
import { useFlashKey } from "@/plugins/useFlash";
import Code from "@/components/elements/Code";

import BeforeContent from "@blueprint/components/Account/API/BeforeContent";
import AfterContent from "@blueprint/components/Account/API/AfterContent";

export default () => {
  const [deleteIdentifier, setDeleteIdentifier] = useState("");
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const { clearAndAddHttpError, clearFlashes } = useFlashKey("account");

  useEffect(() => {
    clearFlashes();
    getApiKeys()
      .then((keys) => setKeys(keys))
      .then(() => setLoading(false))
      .catch((error) => clearAndAddHttpError(error));
  }, []);

  const doDeletion = (identifier: string) => {
    setLoading(true);
    clearFlashes();
    deleteApiKey(identifier)
      .then(() =>
        setKeys((s) => [
          ...(s || []).filter((key) => key.identifier !== identifier),
        ]),
      )
      .catch((error) => clearAndAddHttpError(error))
      .then(() => {
        setLoading(false);
        setDeleteIdentifier("");
      });
  };

  return (
    <PageContentBlock title={"Account API"}>
      <FlashMessageRender byKey={"account"} />
      <BeforeContent />
      <div className={"my-10 flex-nowrap md:flex"}>
        <ContentBox
          title={"Create API Key"}
          className={"w-full flex-none md:w-1/2"}
        >
          <CreateApiKeyForm
            onKeyCreated={(key) => setKeys((s) => [...s!, key])}
          />
        </ContentBox>
        <ContentBox
          title={"API Keys"}
          className={"mt-8 flex-1 overflow-hidden md:mt-0 md:ml-8"}
        >
          <SpinnerOverlay visible={loading} />
          <Dialog.Confirm
            title={"Delete API Key"}
            confirm={"Delete Key"}
            open={!!deleteIdentifier}
            onClose={() => setDeleteIdentifier("")}
            onConfirmed={() => doDeletion(deleteIdentifier)}
          >
            All requests using the <Code>{deleteIdentifier}</Code> key will be
            invalidated.
          </Dialog.Confirm>
          {keys.length === 0 ? (
            <p className={"text-center text-sm"}>
              {loading ? "Loading..." : "No API keys exist for this account."}
            </p>
          ) : (
            keys.map((key, index) => (
              <GreyRowBox
                key={key.identifier}
                className={classNames(
                  "flex items-center bg-neutral-600",
                  index > 0 && "mt-2",
                )}
              >
                <Key className={"h-4 w-4 shrink-0 text-neutral-300"} />
                <div className={"ml-4 flex-1 overflow-hidden"}>
                  <p className={"text-sm wrap-break-word"}>{key.description}</p>
                  <p className={"text-2xs text-neutral-300 uppercase"}>
                    Last used:&nbsp;
                    {key.lastUsedAt
                      ? format(key.lastUsedAt, "MMM do, yyyy HH:mm")
                      : "Never"}
                  </p>
                </div>
                <p className={"ml-4 hidden text-sm md:block"}>
                  <code
                    className={"rounded bg-neutral-900 px-2 py-1 font-mono"}
                  >
                    <SensitiveValue>{key.identifier}</SensitiveValue>
                  </code>
                </p>
                <button
                  className={"ml-4 cursor-pointer p-2 text-sm"}
                  onClick={() => setDeleteIdentifier(key.identifier)}
                >
                  <Trash2
                    size={16}
                    className={
                      "text-neutral-400 transition-colors duration-150 hover:text-red-400"
                    }
                  />
                </button>
              </GreyRowBox>
            ))
          )}
        </ContentBox>
      </div>
      <AfterContent />
    </PageContentBlock>
  );
};
