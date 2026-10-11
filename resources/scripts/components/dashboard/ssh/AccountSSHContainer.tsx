import usePanelTranslation from "@/plugins/usePanelTranslation";
import SensitiveValue from "@/components/elements/SensitiveValue";
import React, { useEffect } from "react";
import ContentBox from "@/components/elements/ContentBox";
import SpinnerOverlay from "@/components/elements/SpinnerOverlay";
import FlashMessageRender from "@/components/FlashMessageRender";
import PageContentBlock from "@/components/elements/PageContentBlock";
import clsx from "clsx";
import GreyRowBox from "@/components/elements/GreyRowBox";
import { useSSHKeys } from "@/api/account/ssh-keys";
import { useFlashKey } from "@/plugins/useFlash";
import { Key } from "lucide-react";
import { format } from "date-fns";
import CreateSSHKeyForm from "@/components/dashboard/ssh/CreateSSHKeyForm";
import DeleteSSHKeyButton from "@/components/dashboard/ssh/DeleteSSHKeyButton";

import BeforeContent from "@blueprint/components/Account/SSH/BeforeContent";
import AfterContent from "@blueprint/components/Account/SSH/AfterContent";

export default () => {
  const { t } = usePanelTranslation();
  const { clearAndAddHttpError } = useFlashKey("account");
  const { data, isValidating, error } = useSSHKeys({
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });

  useEffect(() => {
    clearAndAddHttpError(error);
  }, [error]);

  return (
    <PageContentBlock title={t("ssh.ssh_keys", "SSH Keys")}>
      <FlashMessageRender byKey={"account"} />
      <BeforeContent />
      <div className={"my-10 flex-nowrap md:flex"}>
        <ContentBox
          title={t("ssh.add_ssh_key", "Add SSH Key")}
          className={"w-full flex-none md:w-1/2"}
        >
          <CreateSSHKeyForm />
        </ContentBox>
        <ContentBox
          title={t("ssh.ssh_keys", "SSH Keys")}
          className={"mt-8 flex-1 overflow-hidden md:mt-0 md:ml-8"}
        >
          <SpinnerOverlay visible={!data && isValidating} />
          {!data || !data.length ? (
            <p className={"text-center text-sm"}>
              {!data
                ? t("ssh.loading", "Loading...")
                : t(
                    "ssh.no_ssh_keys_exist_for_this_account",
                    "No SSH Keys exist for this account.",
                  )}
            </p>
          ) : (
            data.map((key, index) => (
              <GreyRowBox
                key={key.fingerprint}
                className={clsx(
                  "flex items-center space-x-4 bg-neutral-600",
                  index > 0 && "mt-2",
                )}
              >
                <Key className={"h-4 w-4 shrink-0 text-neutral-300"} />
                <div className={"flex-1"}>
                  <p className={"text-sm font-medium wrap-break-word"}>
                    {key.name}
                  </p>
                  <p className={"mt-1 truncate font-mono text-xs"}>
                    <SensitiveValue>
                      {t("ssh.sha256", "SHA256:")}
                      {key.fingerprint}
                    </SensitiveValue>
                  </p>
                  <p className={"mt-1 text-xs text-neutral-300 uppercase"}>
                    {t("ssh.added_on_nbsp", "Added on:\u00A0")}
                    {format(key.createdAt, "MMM do, yyyy HH:mm")}
                  </p>
                </div>
                <DeleteSSHKeyButton
                  name={key.name}
                  fingerprint={key.fingerprint}
                />
              </GreyRowBox>
            ))
          )}
        </ContentBox>
      </div>
      <AfterContent />
    </PageContentBlock>
  );
};
