import usePanelTranslation from "@/plugins/usePanelTranslation";
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import getServerSchedule from "@/api/server/schedules/getServerSchedule";
import createOrUpdateSchedule from "@/api/server/schedules/createOrUpdateSchedule";
import Spinner from "@/components/elements/Spinner";
import FlashMessageRender from "@/components/FlashMessageRender";
import EditScheduleModal from "@/components/server/schedules/EditScheduleModal";
import NewTaskButton from "@/components/server/schedules/NewTaskButton";
import DeleteScheduleButton from "@/components/server/schedules/DeleteScheduleButton";
import Can from "@/components/elements/Can";
import useFlash from "@/plugins/useFlash";
import { ServerContext } from "@/state/server";
import PageContentBlock from "@/components/elements/PageContentBlock";
import clsx from "clsx";
import { Button } from "@/components/elements/button/index";
import ScheduleTaskRow from "@/components/server/schedules/ScheduleTaskRow";
import { dequal as isEqual } from "dequal";
import RunScheduleButton from "@/components/server/schedules/RunScheduleButton";
import { useAppStore } from "@/state";
import {
  cronExpression,
  describeCron,
  formatScheduleDate,
} from "./scheduleHelpers";

import BeforeEdit from "@blueprint/components/Server/Schedules/Edit/BeforeEdit";
import AfterEdit from "@blueprint/components/Server/Schedules/Edit/AfterEdit";

export default () => {
  const { t } = usePanelTranslation();
  const navigate = useNavigate();
  const { id: scheduleId } = useParams<{ id: string }>();
  const id = ServerContext.useStoreState((state) => state.server.data!.id);
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const timezone = useAppStore(
    (state) => state.settings.data?.timezone ?? "UTC",
  );
  const { clearFlashes, clearAndAddHttpError } = useFlash();
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const schedule = ServerContext.useStoreState(
    (state) =>
      state.schedules.data.find((s) => s.id === parseInt(scheduleId!, 10)),
    isEqual,
  );
  const appendSchedule = ServerContext.useStoreActions(
    (actions) => actions.schedules.appendSchedule,
  );

  const toggleAutomaticRuns = () => {
    if (!schedule) return;
    clearFlashes("schedules");
    setSavingStatus(true);
    createOrUpdateSchedule(uuid, {
      ...schedule,
      isActive: !schedule.isActive,
    })
      .then((saved) => appendSchedule(saved))
      .catch((error) => clearAndAddHttpError({ error, key: "schedules" }))
      .finally(() => setSavingStatus(false));
  };

  useEffect(() => {
    if (schedule) {
      setIsLoading(false);
      return;
    }
    if (!scheduleId) return;
    clearFlashes("schedules");
    getServerSchedule(uuid, parseInt(scheduleId, 10))
      .then((schedule) => appendSchedule(schedule))
      .catch((error) => clearAndAddHttpError({ error, key: "schedules" }))
      .then(() => setIsLoading(false));
  }, [scheduleId]);

  return (
    <PageContentBlock title={t("schedule_edit.schedules", "Schedules")}>
      <FlashMessageRender byKey={"schedules"} className={"mb-4"} />
      {!schedule || isLoading ? (
        <Spinner size={"large"} centered />
      ) : (
        <>
          <BeforeEdit />
          <Link
            className={
              "text-primary-300 mb-4 inline-block text-sm hover:underline"
            }
            to={"/server/" + id + "/schedules"}
          >
            {t("schedule_edit.larr_all_schedules", "← All schedules")}
          </Link>
          <div className={"rounded bg-neutral-900 p-4 shadow-sm sm:p-6"}>
            <div className={"flex flex-wrap items-start justify-between gap-4"}>
              <div className={"min-w-0 flex-1"}>
                <h3 className={"text-2xl wrap-break-word text-neutral-100"}>
                  {schedule.name}
                </h3>
                <p className={"mt-2 text-neutral-200"}>
                  {describeCron(schedule.cron)}
                </p>
                <p className={"mt-1 text-sm text-neutral-400"}>
                  {t("schedule_edit.panel_timezone", "Panel timezone:")}{" "}
                  {timezone}
                </p>
              </div>
              <span
                className={clsx(
                  "rounded-full px-3 py-1 text-xs",
                  schedule.isProcessing
                    ? "bg-primary-600 text-white"
                    : schedule.isActive
                      ? "bg-green-700 text-white"
                      : "bg-neutral-600 text-neutral-200",
                )}
              >
                {schedule.isProcessing
                  ? t("schedule_edit.running", "Running")
                  : schedule.isActive
                    ? t("schedule_edit.enabled", "Enabled")
                    : t("schedule_edit.paused", "Paused")}
              </span>
            </div>
            <div className={"mt-5 grid gap-3 text-sm sm:grid-cols-2"}>
              <div className={"rounded bg-neutral-800 p-3"}>
                <p className={"text-neutral-400"}>
                  {t("schedule_edit.last_run", "Last run")}
                </p>
                <p className={"mt-1"}>
                  {schedule.lastRunAt
                    ? formatScheduleDate(schedule.lastRunAt, timezone)
                    : t("schedule_edit.never", "Never")}
                </p>
              </div>
              <div className={"rounded bg-neutral-800 p-3"}>
                <p className={"text-neutral-400"}>
                  {t("schedule_edit.next_run", "Next run")}
                </p>
                <p className={"mt-1"}>
                  {!schedule.isActive
                    ? t("schedule_edit.paused", "Paused")
                    : schedule.nextRunAt
                      ? formatScheduleDate(schedule.nextRunAt, timezone)
                      : t("schedule_edit.not_scheduled", "Not scheduled")}
                </p>
              </div>
            </div>
            <p className={"mt-4 text-sm text-neutral-300"}>
              {schedule.isActive
                ? t(
                    "schedule_edit.automatic_runs_are_enabled",
                    "Automatic runs are enabled.",
                  )
                : t(
                    "schedule_edit.automatic_runs_are_paused",
                    "Automatic runs are paused.",
                  )}{" "}
              {schedule.onlyWhenOnline
                ? t(
                    "schedule_edit.runs_are_skipped_when_the_server_is_offline",
                    "Runs are skipped when the server is offline.",
                  )
                : t(
                    "schedule_edit.runs_can_start_while_the_server_is_offline",
                    "Runs can start while the server is offline.",
                  )}
            </p>
            <details className={"mt-4 text-sm text-neutral-400"}>
              <summary className={"cursor-pointer"}>
                {t(
                  "schedule_edit.view_cron_expression",
                  "View cron expression",
                )}
              </summary>
              <code className={"mt-2 block break-all"}>
                {cronExpression(schedule.cron)}
              </code>
              <p className={"mt-1 text-xs"}>
                {t(
                  "schedule_edit.minute_hour_day_of_month_month_day_of_week",
                  "Minute · Hour · Day of month · Month · Day of week",
                )}
              </p>
            </details>
            <Can action={"schedule.update"}>
              <div className={"mt-5 flex flex-wrap gap-3"}>
                <Button.Text onClick={() => setShowEditModal(true)}>
                  {t("schedule_edit.edit_timing", "Edit timing")}
                </Button.Text>
                {(schedule.tasks.length > 0 || schedule.isActive) && (
                  <Button.Text
                    disabled={savingStatus || schedule.isProcessing}
                    onClick={toggleAutomaticRuns}
                  >
                    {savingStatus
                      ? t("schedule_edit.saving", "Saving…")
                      : schedule.isActive
                        ? t("schedule_edit.pause_schedule", "Pause schedule")
                        : t("schedule_edit.enable_schedule", "Enable schedule")}
                  </Button.Text>
                )}
                {schedule.tasks.length > 0 && (
                  <NewTaskButton schedule={schedule} />
                )}
              </div>
            </Can>
          </div>
          <div className={"mt-6"}>
            <h3 className={"mb-2 text-lg"}>
              {t("schedule_edit.steps", "Steps")}
            </h3>
            <p className={"mb-4 text-sm text-neutral-400"}>
              {t(
                "schedule_edit.actions_are_sent_in_order_add_a_wait_between_steps",
                "Actions are sent in order. Add a wait between steps to give a restart or backup time to finish.",
              )}
            </p>
            <div className={"rounded bg-neutral-700"}>
              {schedule.tasks.length > 0 ? (
                [...schedule.tasks]
                  .sort((a, b) => a.sequenceId - b.sequenceId)
                  .map((task, index) => (
                    <ScheduleTaskRow
                      key={task.id}
                      task={task}
                      schedule={schedule}
                      stepNumber={index + 1}
                    />
                  ))
              ) : (
                <div className={"p-6 text-center"}>
                  <h4 className={"text-lg"}>
                    {t(
                      "schedule_edit.add_the_first_step",
                      "Add the first step",
                    )}
                  </h4>
                  <p className={"mt-2 mb-5 text-sm text-neutral-300"}>
                    {t(
                      "schedule_edit.the_timing_is_saved_choose_a_restart_a_backup_or",
                      "The timing is saved. Choose a restart, a backup, or a console command to give this schedule something to do.",
                    )}
                  </p>
                  <Can action={"schedule.update"}>
                    <NewTaskButton
                      schedule={schedule}
                      label={t(
                        "schedule_edit.add_first_step",
                        "Add first step",
                      )}
                    />
                  </Can>
                </div>
              )}
            </div>
          </div>
          <EditScheduleModal
            visible={showEditModal}
            schedule={schedule}
            onModalDismissed={() => setShowEditModal(false)}
          />
          <div className={"mt-6 flex flex-wrap gap-y-3 sm:justify-end"}>
            <Can action={"schedule.delete"}>
              <DeleteScheduleButton
                scheduleId={schedule.id}
                onDeleted={() => navigate("/server/" + id + "/schedules")}
              />
            </Can>
            {schedule.tasks.length > 0 && (
              <Can action={"schedule.update"}>
                <RunScheduleButton schedule={schedule} />
              </Can>
            )}
          </div>
          {schedule.tasks.length > 0 && (
            <p className={"mt-3 text-sm text-neutral-400 sm:text-right"}>
              {t(
                "schedule_edit.run_now_works_even_when_automatic_runs_are_paused_it",
                "Run now works even when automatic runs are paused. It still respects the offline setting.",
              )}
            </p>
          )}
          <AfterEdit />
        </>
      )}
    </PageContentBlock>
  );
};
