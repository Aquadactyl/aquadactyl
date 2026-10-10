import SensitiveValue from "@/components/elements/SensitiveValue";
import React from "react";
import { Link } from "react-router";
import Tooltip from "@/components/elements/tooltip/Tooltip";
import Translate from "@/components/elements/Translate";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ActivityLog } from "@definitions/user";
import ActivityLogMetaButton from "@/components/elements/activity/ActivityLogMetaButton";
import { FolderOpen, Terminal } from "lucide-react";
import Avatar from "@/components/Avatar";
import useLocationHash from "@/plugins/useLocationHash";
import { getObjectKeys, isObject } from "@/lib/objects";
import { activityEventLabel } from "./events";
import { useAppStore } from "@/state";
import { isSensitiveProperty } from "./sensitiveProperties";

interface Props {
  activity: ActivityLog;
  children?: React.ReactNode;
}

function wrapProperties(value: unknown, key = ""): any {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number"
  ) {
    const content = isSensitiveProperty(key, value)
      ? `<sensitive>${String(value)}</sensitive>`
      : String(value);
    return `<strong>${content}</strong>`;
  }

  if (isObject(value)) {
    return getObjectKeys(value).reduce(
      (obj, key) => {
        if (
          key === "count" ||
          (typeof key === "string" && key.endsWith("_count"))
        ) {
          return { ...obj, [key]: value[key] };
        }
        return {
          ...obj,
          [key]: wrapProperties(value[key], String(key)),
        };
      },
      {} as Record<string, unknown>,
    );
  }

  if (Array.isArray(value)) {
    return value.map((item) => wrapProperties(item, key));
  }

  return value;
}

export default ({ activity, children }: Props) => {
  const { pathTo } = useLocationHash();
  const actor = activity.relationships.actor;
  const properties = wrapProperties(activity.properties);
  const currentUser = useAppStore((state) => state.user.data);
  const avatarUrl =
    actor?.uuid === currentUser?.uuid
      ? currentUser?.avatarUrl
      : actor?.avatarUrl;
  const eventLabel = activityEventLabel(activity.event);

  return (
    <article className={"activity_entry"}>
      <div className={"activity_avatar"}>
        <Avatar
          name={actor?.uuid || "system"}
          src={avatarUrl}
          alt={`${actor?.username || "System"}'s profile picture`}
          size={40}
        />
      </div>
      <div className={"activity_content"}>
        <div className={"activity_header"}>
          <div className={"activity_identity"}>
            <span className={"activity_username"}>
              {actor?.username || "System"}
            </span>
            <Link
              to={`#${pathTo({ event: undefined, event_exact: activity.event, page: undefined })}`}
              className={"activity_event"}
              title={activity.event}
              aria-label={`Filter by ${eventLabel}`}
            >
              {eventLabel}
            </Link>
          </div>
          {activity.hasAdditionalMetadata && (
            <ActivityLogMetaButton meta={activity.properties} />
          )}
        </div>
        <p className={"activity_description"}>
          <Translate
            ns={"activity"}
            values={properties}
            i18nKey={activity.event.replace(":", ".")}
            defaults={activity.description || eventLabel}
            components={{ sensitive: <SensitiveValue /> }}
          />
        </p>
        <div className={"activity_details"}>
          <Tooltip
            placement={"top"}
            content={format(activity.timestamp, "MMM do, yyyy H:mm:ss")}
          >
            <time dateTime={activity.timestamp.toISOString()} tabIndex={0}>
              {formatDistanceToNowStrict(activity.timestamp, {
                addSuffix: true,
              })}
            </time>
          </Tooltip>
          {activity.ip && (
            <Link
              to={`#${pathTo({ ip: activity.ip, page: undefined })}`}
              className={"activity_ip"}
              aria-label={`Filter by IP address ${activity.ip}`}
            >
              <SensitiveValue>{activity.ip}</SensitiveValue>
            </Link>
          )}
          <div className={"activity_icons"}>
            {activity.isApi && (
              <Tooltip placement={"top"} content={"Using API Key"}>
                <span tabIndex={0} aria-label={"API activity"}>
                  <Terminal />
                </span>
              </Tooltip>
            )}
            {(activity.event.startsWith("server:sftp.") ||
              activity.event.startsWith("auth:sftp.")) && (
              <Tooltip placement={"top"} content={"Using SFTP"}>
                <span tabIndex={0} aria-label={"SFTP activity"}>
                  <FolderOpen />
                </span>
              </Tooltip>
            )}
            {children}
          </div>
        </div>
      </div>
    </article>
  );
};
