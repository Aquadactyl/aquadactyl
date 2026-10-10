import React, { useContext, useEffect } from "react";
import { Schedule, Task } from "@/api/server/schedules/getServerSchedules";
import { Field as FormikField, Form, Formik, FormikHelpers } from "formik";
import { ServerContext } from "@/state/server";
import createOrUpdateScheduleTask from "@/api/server/schedules/createOrUpdateScheduleTask";
import { httpErrorToHuman } from "@/api/http";
import Field from "@/components/elements/Field";
import FlashMessageRender from "@/components/FlashMessageRender";
import useFlash from "@/plugins/useFlash";
import FormikFieldWrapper from "@/components/elements/FormikFieldWrapper";
import { Textarea } from "@/components/elements/Input";
import { Button } from "@/components/elements/button/index";
import ModalContext from "@/context/ModalContext";
import asModal from "@/hoc/asModal";
import FormikSwitch from "@/components/elements/FormikSwitch";
import { ScheduleSelect } from "./ScheduleTimingFields";
import {
  DelayUnit,
  TaskKind,
  delayFromSeconds,
  delayToSeconds,
  taskData,
  taskKind,
  taskKinds,
} from "./scheduleHelpers";

interface Props {
  schedule: Schedule;
  task?: Task;
}

interface Values {
  kind: TaskKind;
  payload: string;
  delay: string;
  delayUnit: DelayUnit;
  continueOnFailure: boolean;
}

const TaskDetailsModal = ({ schedule, task }: Props) => {
  const { dismiss } = useContext(ModalContext);
  const { clearFlashes, addError } = useFlash();
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const appendSchedule = ServerContext.useStoreActions(
    (actions) => actions.schedules.appendSchedule,
  );
  const backupLimit = ServerContext.useStoreState(
    (state) => state.server.data!.featureLimits.backups,
  );
  const firstStep = task
    ? task.id ===
      [...schedule.tasks].sort((a, b) => a.sequenceId - b.sequenceId)[0]?.id
    : schedule.tasks.length === 0;

  useEffect(() => () => clearFlashes("schedule:task"), []);

  const submit = (values: Values, { setSubmitting }: FormikHelpers<Values>) => {
    clearFlashes("schedule:task");
    if (backupLimit === 0 && values.kind === "backup") {
      setSubmitting(false);
      addError({
        message:
          "Backups are unavailable because this server has no backup slots.",
        key: "schedule:task",
      });
      return;
    }
    createOrUpdateScheduleTask(uuid, schedule.id, task?.id, {
      ...taskData(values.kind, values.payload),
      timeOffset: delayToSeconds(values.delay, values.delayUnit),
      continueOnFailure: values.continueOnFailure,
    })
      .then((saved) => {
        const tasks = schedule.tasks.some((t) => t.id === saved.id)
          ? schedule.tasks.map((t) => (t.id === saved.id ? saved : t))
          : [...schedule.tasks, saved];
        appendSchedule({ ...schedule, tasks });
        dismiss();
      })
      .catch((error) => {
        setSubmitting(false);
        addError({
          message: httpErrorToHuman(error),
          key: "schedule:task",
        });
      });
  };

  return (
    <Formik<Values>
      onSubmit={submit}
      validate={(values) => {
        const errors: Partial<Record<keyof Values, string>> = {};
        if (!(values.kind in taskKinds))
          errors.kind = "Choose what this step should do.";
        if (values.kind === "command" && !values.payload.trim())
          errors.payload = "Enter the console command to send.";
        try {
          delayToSeconds(values.delay, values.delayUnit);
        } catch (error) {
          errors.delay = (error as Error).message;
        }
        return errors;
      }}
      initialValues={{
        kind: task ? taskKind(task) : "restart",
        payload: task && task.action !== "power" ? task.payload : "",
        ...delayFromSeconds(task?.timeOffset ?? 0),
        continueOnFailure: task?.continueOnFailure ?? false,
      }}
    >
      {({ isSubmitting, values, setValues }) => (
        <Form className={"m-0"}>
          <h2 className={"mb-2 text-2xl"}>
            {task ? "Edit step" : "Add a step"}
          </h2>
          <p className={"mb-6 text-sm text-neutral-300"}>
            Steps run in order. Add a wait if the previous action needs time to
            finish.
          </p>
          <FlashMessageRender byKey={"schedule:task"} className={"mb-4"} />
          <ScheduleSelect
            name={"kind"}
            label={"What should happen?"}
            onChange={(event) => {
              const kind = event.target.value as TaskKind;
              void setValues({
                ...values,
                kind,
                payload: task?.action === kind ? task.payload : "",
              });
            }}
          >
            {Object.entries(taskKinds).map(([value, label]) => (
              <option
                key={value}
                value={value}
                disabled={value === "backup" && backupLimit === 0}
              >
                {label}
              </option>
            ))}
          </ScheduleSelect>
          {backupLimit === 0 && (
            <p className={"mt-2 text-xs text-neutral-400"}>
              Backups need at least one backup slot on this server.
            </p>
          )}
          {values.kind === "start" && schedule.onlyWhenOnline && (
            <p className={"mt-3 text-sm text-yellow-200"}>
              To start an offline server, edit this schedule&apos;s timing and
              turn off &ldquo;Skip when server is offline&rdquo;.
            </p>
          )}
          {values.kind === "kill" && (
            <p className={"mt-3 text-sm text-yellow-200"}>
              Stops the server immediately. Use this when it is unresponsive.
            </p>
          )}
          {(values.kind === "command" || values.kind === "backup") && (
            <FormikFieldWrapper
              id={"schedule-payload"}
              name={"payload"}
              label={
                values.kind === "command"
                  ? "Console command"
                  : "Files to leave out (optional)"
              }
              className={"mt-6"}
              description={
                values.kind === "command"
                  ? "Enter the command as you would in the server console."
                  : "One file or folder pattern per line. Leave empty to use .pteroignore. If all backup slots are full, the oldest backup is replaced."
              }
            >
              <FormikField
                as={Textarea}
                id={"schedule-payload"}
                name={"payload"}
                rows={4}
              />
            </FormikFieldWrapper>
          )}
          <div className={"mt-6 grid gap-4 sm:grid-cols-2"}>
            <Field
              name={"delay"}
              label={"Wait before this step"}
              type={"number"}
              min={0}
              max={values.delayUnit === "minutes" ? 15 : 900}
              step={1}
            />
            <ScheduleSelect name={"delayUnit"} label={"Wait unit"}>
              <option value={"seconds"}>Seconds</option>
              <option value={"minutes"}>Minutes</option>
            </ScheduleSelect>
          </div>
          <p className={"mt-2 text-xs text-neutral-400"}>
            {firstStep
              ? "0 starts at the scheduled time. Run now starts the first step immediately, ignoring this wait."
              : "0 sends this action straight after the previous step. Waiting starts when the previous action is sent, not when it finishes."}{" "}
            Maximum wait: 15 minutes.
          </p>
          <div
            className={
              "mt-6 rounded border border-neutral-600 bg-neutral-800 p-4"
            }
          >
            <FormikSwitch
              name={"continueOnFailure"}
              description={
                "Allow later steps to run if this action fails to reach the server daemon."
              }
              label={"Keep going if this step fails"}
            />
          </div>
          <div className={"mt-6 flex justify-end"}>
            <Button
              type={"submit"}
              disabled={isSubmitting}
              className={"w-full sm:w-auto"}
            >
              {task ? "Save step" : "Add step"}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default asModal<Props>()(TaskDetailsModal);
