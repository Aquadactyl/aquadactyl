import usePanelTranslation from "@/plugins/usePanelTranslation";
import React, { useEffect } from "react";
import { useActivityLogs } from "@/api/account/activity";
import { useFlashKey } from "@/plugins/useFlash";
import PageContentBlock from "@/components/elements/PageContentBlock";
import FlashMessageRender from "@/components/FlashMessageRender";
import { Monitor } from "lucide-react";
import Tooltip from "@/components/elements/tooltip/Tooltip";
import ActivityLogList from "@/components/elements/activity/ActivityLogList";
import useActivityLogFilters from "@/components/elements/activity/useActivityLogFilters";

export default () => {
  const { t } = usePanelTranslation();
  const controls = useActivityLogFilters();
  const { clearAndAddHttpError } = useFlashKey("account:activity");
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
    <PageContentBlock
      title={t("account_activity.account_activity", "Account activity")}
    >
      <FlashMessageRender byKey={"account:activity"} />
      <ActivityLogList
        title={t("account_activity.account_activity", "Account activity")}
        description={t(
          "account_activity.review_sign_ins_security_changes_and_other_actions_on_your",
          "Review sign-ins, security changes, and other actions on your account.",
        )}
        scope={"Your account"}
        data={data}
        isValidating={isValidating}
        hasError={Boolean(error)}
        controls={controls}
        onRefresh={() => mutate()}
      >
        {(activity) =>
          typeof activity.properties.useragent === "string" && (
            <Tooltip content={activity.properties.useragent} placement={"top"}>
              <span
                tabIndex={0}
                aria-label={t(
                  "account_activity.browser_details",
                  "Browser details",
                )}
              >
                <Monitor />
              </span>
            </Tooltip>
          )
        }
      </ActivityLogList>
    </PageContentBlock>
  );
};
