import usePanelTranslation from "@/plugins/usePanelTranslation";
import React, { useContext, useEffect, useState } from "react";
import Spinner from "@/components/elements/Spinner";
import useFlash from "@/plugins/useFlash";
import Can from "@/components/elements/Can";
import CreateBackupButton from "@/components/server/backups/CreateBackupButton";
import FlashMessageRender from "@/components/FlashMessageRender";
import BackupRow from "@/components/server/backups/BackupRow";
import getServerBackups, {
  Context as ServerBackupContext,
} from "@/api/server/backups/getServerBackups";
import { ServerContext } from "@/state/server";
import ServerContentBlock from "@/components/elements/ServerContentBlock";
import Pagination from "@/components/elements/Pagination";

import BeforeContent from "@blueprint/components/Server/Backups/BeforeContent";
import AfterContent from "@blueprint/components/Server/Backups/AfterContent";

const BackupContainer = () => {
  const { t } = usePanelTranslation();
  const { page, setPage } = useContext(ServerBackupContext);
  const { clearFlashes, clearAndAddHttpError } = useFlash();
  const { data: backups, error, isValidating } = getServerBackups();

  const backupLimit = ServerContext.useStoreState(
    (state) => state.server.data!.featureLimits.backups,
  );

  useEffect(() => {
    if (!error) {
      clearFlashes("backups");

      return;
    }

    clearAndAddHttpError({ error, key: "backups" });
  }, [error]);

  if (!backups || (error && isValidating)) {
    return <Spinner size={"large"} centered />;
  }

  return (
    <ServerContentBlock title={t("backups.backups", "Backups")}>
      <FlashMessageRender byKey={"backups"} className={"mb-4"} />
      <BeforeContent />
      <Pagination data={backups} onPageSelect={setPage}>
        {({ items }) =>
          !items.length ? (
            // Don't show any error messages if the server has no backups and the user cannot
            // create additional ones for the server.
            !backupLimit ? null : (
              <p className={"text-center text-sm text-neutral-300"}>
                {page > 1
                  ? t(
                      "backups.looks_like_we_ve_run_out_of_backups_to_show",
                      "Looks like we've run out of backups to show you, try going back a page.",
                    )
                  : t(
                      "backups.it_looks_like_there_are_no_backups_currently_stored_for",
                      "It looks like there are no backups currently stored for this server.",
                    )}
              </p>
            )
          ) : (
            items.map((backup, index) => (
              <BackupRow
                key={backup.uuid}
                backup={backup}
                className={index > 0 ? "mt-2" : undefined}
              />
            ))
          )
        }
      </Pagination>
      {backupLimit === 0 && (
        <p className={"text-center text-sm text-neutral-300"}>
          {t(
            "backups.backups_cannot_be_created_for_this_server_because_the_backup",
            "Backups cannot be created for this server because the backup limit is set to 0.",
          )}
        </p>
      )}
      <Can action={"backup.create"}>
        <div className={"mt-6 items-center justify-end sm:flex"}>
          {backupLimit > 0 && backups.backupCount > 0 && (
            <p className={"mb-4 text-sm text-neutral-300 sm:mr-6 sm:mb-0"}>
              {backups.backupCount} {t("backups.of", "of")} {backupLimit}{" "}
              {t(
                "backups.backups_have_been_created_for_this_server",
                "backups have been created for this server.",
              )}
            </p>
          )}
          {backupLimit > 0 && backupLimit > backups.backupCount && (
            <CreateBackupButton className={"w-full sm:w-auto"} />
          )}
        </div>
      </Can>
      <AfterContent />
    </ServerContentBlock>
  );
};

export default () => {
  const [page, setPage] = useState<number>(1);
  return (
    <ServerBackupContext.Provider value={{ page, setPage }}>
      <BackupContainer />
    </ServerBackupContext.Provider>
  );
};
