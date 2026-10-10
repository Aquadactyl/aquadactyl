import React, { useState } from "react";
import { Schedule, Task } from "@/api/server/schedules/getServerSchedules";
import {
  Code,
  ToggleRight,
  Archive,
  Pencil,
  Trash2,
  ArrowDownCircle,
} from "lucide-react";
import deleteScheduleTask from "@/api/server/schedules/deleteScheduleTask";
import { httpErrorToHuman } from "@/api/http";
import SpinnerOverlay from "@/components/elements/SpinnerOverlay";
import TaskDetailsModal from "@/components/server/schedules/TaskDetailsModal";
import Can from "@/components/elements/Can";
import useFlash from "@/plugins/useFlash";
import { ServerContext } from "@/state/server";
import ConfirmationModal from "@/components/elements/ConfirmationModal";
import { describeDelay, taskKind, taskKinds } from "./scheduleHelpers";

interface Props {
  schedule: Schedule;
  task: Task;
  stepNumber?: number;
}

const getActionDetails = (
  action: string,
): [string, React.ComponentType<{ className?: string }>] => {
  switch (action) {
    case "command":
      return ["Send Command", Code];
    case "power":
      return ["Send Power Action", ToggleRight];
    case "backup":
      return ["Create Backup", Archive];
    default:
      return ["Unknown Action", Code];
  }
};

export default ({ schedule, task, stepNumber = task.sequenceId }: Props) => {
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const { clearFlashes, addError } = useFlash();
  const [visible, setVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const appendSchedule = ServerContext.useStoreActions(
    (actions) => actions.schedules.appendSchedule,
  );

  const onConfirmDeletion = () => {
    setIsLoading(true);
    clearFlashes("schedules");
    deleteScheduleTask(uuid, schedule.id, task.id)
      .then(() =>
        appendSchedule({
          ...schedule,
          tasks: schedule.tasks.filter((t) => t.id !== task.id),
        }),
      )
      .catch((error) => {
        console.error(error);
        setIsLoading(false);
        addError({
          message: httpErrorToHuman(error),
          key: "schedules",
        });
      });
  };

  const [fallbackTitle, ActionIcon] = getActionDetails(task.action);
  const title = taskKinds[taskKind(task)] ?? fallbackTitle;

  return (
    <div
      className={"items-center border-b border-neutral-800 p-3 sm:flex sm:p-6"}
    >
      <SpinnerOverlay visible={isLoading} fixed size={"large"} />
      <TaskDetailsModal
        schedule={schedule}
        task={task}
        visible={isEditing}
        onModalDismissed={() => setIsEditing(false)}
      />
      <ConfirmationModal
        title={"Confirm task deletion"}
        buttonText={"Delete Task"}
        onConfirmed={onConfirmDeletion}
        visible={visible}
        onModalDismissed={() => setVisible(false)}
      >
        Are you sure you want to delete this task? This action cannot be undone.
      </ConfirmationModal>
      <ActionIcon className={"hidden h-5 w-5 shrink-0 text-white md:block"} />
      <div className={"w-full min-w-0 flex-none sm:w-auto sm:flex-1"}>
        <p className={"text-sm font-medium text-neutral-100 md:ml-6"}>
          Step {stepNumber} · {title}
        </p>
        <p className={"mt-1 text-xs text-neutral-300 md:ml-6"}>
          {describeDelay(task.timeOffset)}
          {stepNumber === 1
            ? " before starting"
            : " after the previous action is sent"}
        </p>
        {task.payload && task.action !== "power" && (
          <div className={"mt-2 md:ml-6"}>
            {task.action === "backup" && (
              <p className={"mb-1 text-xs text-neutral-400 uppercase"}>
                Ignoring files & folders:
              </p>
            )}
            <div
              className={
                "inline-block w-auto rounded bg-neutral-800 px-2 py-1 font-mono text-sm break-all whitespace-pre-wrap"
              }
            >
              {task.payload}
            </div>
          </div>
        )}
      </div>
      <div
        className={
          "mt-3 flex w-full flex-wrap items-center gap-y-2 sm:mt-0 sm:ml-4 sm:w-auto"
        }
      >
        {task.continueOnFailure && (
          <div className={"mr-6"}>
            <div
              className={
                "flex items-center rounded-full bg-yellow-500 px-2 py-1 text-sm text-yellow-800"
              }
            >
              <ArrowDownCircle className={"mr-2 h-3.5 w-3.5 shrink-0"} />
              Keeps going on connection failure
            </div>
          </div>
        )}
        <Can action={"schedule.update"}>
          <button
            type={"button"}
            aria-label={"Edit scheduled task"}
            className={
              "mr-4 ml-auto block cursor-pointer p-2 text-sm text-neutral-500 transition-colors duration-150 hover:text-neutral-100 sm:ml-0"
            }
            onClick={() => setIsEditing(true)}
          >
            <Pencil size={16} />
          </button>
        </Can>
        <Can action={"schedule.update"}>
          <button
            type={"button"}
            aria-label={"Delete scheduled task"}
            className={
              "block cursor-pointer p-2 text-sm text-neutral-500 transition-colors duration-150 hover:text-red-600"
            }
            onClick={() => setVisible(true)}
          >
            <Trash2 size={16} />
          </button>
        </Can>
      </div>
    </div>
  );
};
