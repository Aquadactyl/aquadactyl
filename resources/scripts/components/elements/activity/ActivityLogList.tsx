import React, { useEffect, useState } from "react";
import { ActivityLog } from "@definitions/user";
import { ActivityLogResult } from "@/api/activity";
import { Clock, RefreshCw } from "lucide-react";
import classNames from "classnames";
import Spinner from "@/components/elements/Spinner";
import PaginationFooter from "@/components/elements/table/PaginationFooter";
import ActivityLogEntry from "./ActivityLogEntry";
import ActivityLogFilters from "./ActivityLogFilters";
import useActivityLogFilters from "./useActivityLogFilters";

interface Props {
  title: string;
  description: string;
  scope: string;
  data?: ActivityLogResult;
  isValidating: boolean;
  hasError: boolean;
  controls: ReturnType<typeof useActivityLogFilters>;
  onRefresh: () => void;
  children?: (activity: ActivityLog) => React.ReactNode;
}
export default ({
  title,
  description,
  scope,
  data,
  isValidating,
  hasError,
  controls,
  onRefresh,
  children,
}: Props) => {
  const [events, setEvents] = useState<string[]>([]);
  useEffect(() => {
    if (data) setEvents(data.availableEvents);
  }, [data]);
  return (
    <>
      <div className={"page-heading"}>
        <div>
          <p className={"page-eyebrow"}>{scope}</p>
          <h1 className={"page-title"}>{title}</h1>
          <p className={"page-description"}>{description}</p>
        </div>
        <button
          type={"button"}
          className={"panel-link-button"}
          disabled={isValidating}
          onClick={onRefresh}
        >
          <RefreshCw
            className={classNames("h-4 w-4", {
              "is-refreshing": isValidating,
            })}
          />{" "}
          Refresh
        </button>
      </div>
      <ActivityLogFilters
        events={events}
        hash={controls.hash}
        hasFilters={controls.hasFilters}
        onChange={controls.update}
        onClear={controls.clear}
      />
      <section
        className={"activity-list"}
        aria-label={"Activity history"}
        aria-busy={isValidating}
      >
        <div className={"activity-list-header"}>
          <h2>Activity history</h2>
          <p role={"status"}>
            {data
              ? `${data.pagination.total.toLocaleString()} ${
                  data.pagination.total === 1 ? "event" : "events"
                }${controls.hasFilters ? " matching your filters" : ""}`
              : hasError
                ? "Unable to load activity"
                : "Loading activity…"}
          </p>
        </div>
        {!data && !hasError ? (
          <div className={"activity-empty"}>
            <Spinner centered />
          </div>
        ) : !data?.items.length ? (
          <div className={"activity-empty"}>
            <span className={"activity-empty-icon"}>
              <Clock />
            </span>
            <h3>
              {hasError
                ? "Activity could not be loaded"
                : controls.hasFilters
                  ? "No matching activity"
                  : "No activity yet"}
            </h3>
            <p>
              {hasError
                ? "Try refreshing the page or clearing your filters."
                : controls.hasFilters
                  ? "Choose another event or time range to see more activity."
                  : "Actions will appear here as they happen."}
            </p>
            {controls.hasFilters && (
              <button className={"panel-link-button"} onClick={controls.clear}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          data.items.map((activity) => (
            <ActivityLogEntry key={activity.id} activity={activity}>
              {children?.(activity)}
            </ActivityLogEntry>
          ))
        )}
        {data && data.pagination.total > 0 && (
          <PaginationFooter
            className={"activity-pagination"}
            pagination={data.pagination}
            onPageSelect={(page) =>
              controls.update({ page: String(page) }, false)
            }
          />
        )}
      </section>
    </>
  );
};
