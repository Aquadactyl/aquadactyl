import usePanelTranslation from "@/plugins/usePanelTranslation";
import React from "react";
import TitledGreyBox from "@/components/elements/TitledGreyBox";
import { ServerContext } from "@/state/server";
import { useAppStore } from "@/state";
import RenameServerBox from "@/components/server/settings/RenameServerBox";
import SubdomainBox from "@/components/server/settings/SubdomainBox";
import FlashMessageRender from "@/components/FlashMessageRender";
import Can from "@/components/elements/Can";
import ReinstallServerBox from "@/components/server/settings/ReinstallServerBox";
import Input from "@/components/elements/Input";
import Label from "@/components/elements/Label";
import ServerContentBlock from "@/components/elements/ServerContentBlock";
import { dequal as isEqual } from "dequal";
import CopyOnClick from "@/components/elements/CopyOnClick";
import { ip } from "@/lib/formatters";
import { Button } from "@/components/elements/button/index";

import BeforeContent from "@blueprint/components/Server/Settings/BeforeContent";
import AfterContent from "@blueprint/components/Server/Settings/AfterContent";

export default () => {
  const { t } = usePanelTranslation();
  const username = useAppStore((state) => state.user.data!.username);
  const id = ServerContext.useStoreState((state) => state.server.data!.id);
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const node = ServerContext.useStoreState((state) => state.server.data!.node);
  const sftp = ServerContext.useStoreState(
    (state) => state.server.data!.sftpDetails,
    isEqual,
  );

  return (
    <ServerContentBlock title={t("settings.settings", "Settings")}>
      <FlashMessageRender byKey={"settings"} className={"mb-4"} />
      <BeforeContent />
      <div className={"md:flex"}>
        <div className={"w-full md:mr-10 md:flex-1"}>
          <Can action={"file.sftp"}>
            <TitledGreyBox
              title={t("settings.sftp_details", "SFTP Details")}
              className={"mb-6 md:mb-10"}
            >
              <div>
                <Label>{t("settings.server_address", "Server Address")}</Label>
                <CopyOnClick text={`sftp://${ip(sftp.ip)}:${sftp.port}`}>
                  <Input
                    data-sensitive
                    type={"text"}
                    value={`sftp://${ip(sftp.ip)}:${sftp.port}`}
                    readOnly
                  />
                </CopyOnClick>
              </div>
              <div className={"mt-6"}>
                <Label>{t("settings.username", "Username")}</Label>
                <CopyOnClick text={`${username}.${id}`}>
                  <Input
                    data-sensitive
                    type={"text"}
                    value={`${username}.${id}`}
                    readOnly
                  />
                </CopyOnClick>
              </div>
              <div className={"mt-6 flex items-center"}>
                <div className={"flex-1"}>
                  <div className={"border-l-4 border-cyan-500 p-3"}>
                    <p className={"text-xs text-neutral-200"}>
                      {t(
                        "settings.your_sftp_password_is_the_same_as_the_password_you",
                        "Your SFTP password is the same as the password you use to access this panel.",
                      )}
                    </p>
                  </div>
                </div>
                <div className={"ml-4"}>
                  <a
                    href={`sftp://${username}.${id}@${ip(sftp.ip)}:${sftp.port}`}
                  >
                    <Button.Text variant={Button.Variants.Secondary}>
                      {t("settings.launch_sftp", "Launch SFTP")}
                    </Button.Text>
                  </a>
                </div>
              </div>
            </TitledGreyBox>
          </Can>
          <TitledGreyBox
            title={t("settings.debug_information", "Debug Information")}
            className={"mb-6 md:mb-10"}
          >
            <div className={"flex items-center justify-between text-sm"}>
              <p>{t("settings.node", "Node")}</p>
              <code className={"rounded bg-neutral-900 px-2 py-1 font-mono"}>
                {node}
              </code>
            </div>
            <CopyOnClick text={uuid}>
              <div className={"mt-2 flex items-center justify-between text-sm"}>
                <p>{t("settings.server_id", "Server ID")}</p>
                <code className={"rounded bg-neutral-900 px-2 py-1 font-mono"}>
                  {uuid}
                </code>
              </div>
            </CopyOnClick>
          </TitledGreyBox>
        </div>
        <div className={"mt-6 w-full md:mt-0 md:flex-1"}>
          <Can action={"settings.rename"}>
            <SubdomainBox />
            <div className={"mb-6 md:mb-10"}>
              <RenameServerBox />
            </div>
          </Can>
          <Can action={"settings.reinstall"}>
            <ReinstallServerBox />
          </Can>
        </div>
      </div>
      <AfterContent />
    </ServerContentBlock>
  );
};
