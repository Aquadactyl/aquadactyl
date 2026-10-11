import usePanelTranslation from "@/plugins/usePanelTranslation";
import React, { useEffect } from "react";
import { useActivityLogs } from "@/api/server/activity";
import ServerContentBlock from "@/components/elements/ServerContentBlock";
import { useFlashKey } from "@/plugins/useFlash";
import FlashMessageRender from "@/components/FlashMessageRender";
import ActivityLogList from "@/components/elements/activity/ActivityLogList";
import useActivityLogFilters from "@/components/elements/activity/useActivityLogFilters";
import { ServerContext } from "@/state/server";

export default () => {
  const { t } = usePanelTranslation();
  const controls = useActivityLogFilters();
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const { clearAndAddHttpError } = useFlashKey("server:activity");
  const { data, isValidating, error, mutate } = useActivityLogs(
    controls.filters,
    {
      revalidateOnMount: true,
      revalidateOnFocus: false,
    },
  );

  useEffect(() => {
    clearAndAddHttpError(error);
  }, [error]);

  return (
    <ServerContentBlock title={t("server_activity.activity", "Activity")}>
      <FlashMessageRender byKey={"server:activity"} />
      <ActivityLogList
        key={uuid}
        title={t("server_activity.server_activity", "Server activity")}
        description={t(
          "server_activity.keep_track_of_changes_file_access_and_other_actions_on",
          "Keep track of changes, file access, and other actions on this server.",
        )}
        scope={"Your server"}
        data={data}
        isValidating={isValidating}
        hasError={Boolean(error)}
        controls={controls}
        onRefresh={() => mutate()}
      />
    </ServerContentBlock>
  );
};
