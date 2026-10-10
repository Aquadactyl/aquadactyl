import React, { useContext, useEffect } from "react";
import { Schedule } from "@/api/server/schedules/getServerSchedules";
import FormField from "@/components/elements/FormField";
import { FormProvider, useForm } from "react-hook-form";
import Switch from "@/components/elements/Switch";
import createOrUpdateSchedule from "@/api/server/schedules/createOrUpdateSchedule";
import { ServerContext } from "@/state/server";
import { useAppStore } from "@/state";
import { httpErrorToHuman } from "@/api/http";
import FlashMessageRender from "@/components/FlashMessageRender";
import useFlash from "@/plugins/useFlash";
import { Button } from "@/components/elements/button/index";
import ModalContext from "@/context/ModalContext";
import asModal from "@/hoc/asModal";
import ScheduleTimingFields, { TimingValues } from "./ScheduleTimingFields";
import {
  cronFromTiming,
  defaultTiming,
  timingErrors,
  timingFromCron,
} from "./scheduleHelpers";

interface Props {
  schedule?: Schedule;
  onCreated?: (schedule: Schedule) => void;
}

interface Values extends TimingValues {
  name: string;
  enabled: boolean;
  onlyWhenOnline: boolean;
}

const validate = (values: Values) => {
  const errors: Record<string, { type: string; message: string }> = {};
  const tErrors = timingErrors(values);
  for (const [k, v] of Object.entries(tErrors)) {
    if (v) errors[k] = { type: "custom", message: v };
  }
  if (!values.name?.trim()) {
    errors.name = { type: "required", message: "Give this schedule a name." };
  } else if (values.name.trim().length > 191) {
    errors.name = {
      type: "maxLength",
      message: "Use a name with no more than 191 characters.",
    };
  }
  if (values.frequency === "custom") {
    const cronFields = [
      "minute",
      "hour",
      "dayOfMonth",
      "month",
      "dayOfWeek",
    ] as const;
    for (const field of cronFields) {
      if (!values[field]?.trim()) {
        errors[field] = {
          type: "required",
          message: "Enter a cron value, or * for any.",
        };
      }
    }
  }
  return {
    values: Object.keys(errors).length === 0 ? values : {},
    errors,
  };
};

const EditScheduleModal = ({ schedule, onCreated }: Props) => {
  const { addError, clearFlashes } = useFlash();
  const { dismiss } = useContext(ModalContext);
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const timezone = useAppStore(
    (state) => state.settings.data?.timezone ?? "UTC",
  );
  const appendSchedule = ServerContext.useStoreActions(
    (actions) => actions.schedules.appendSchedule,
  );

  useEffect(() => () => clearFlashes("schedule:edit"), []);

  const methods = useForm<Values>({
    resolver: validate,
    defaultValues: {
      ...(schedule ? timingFromCron(schedule.cron) : defaultTiming),
      ...(schedule?.cron ?? {
        minute: "0",
        hour: "3",
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "*",
      }),
      name: schedule?.name || "",
      enabled: schedule?.isActive ?? false,
      onlyWhenOnline: schedule?.onlyWhenOnline ?? true,
    },
  });

  const submit = async (values: Values) => {
    clearFlashes("schedule:edit");
    try {
      const saved = await createOrUpdateSchedule(uuid, {
        id: schedule?.id,
        name: values.name.trim(),
        cron: cronFromTiming(values, values),
        onlyWhenOnline: values.onlyWhenOnline,
        isActive: values.enabled,
      });
      appendSchedule(saved);
      dismiss();
      if (!schedule) onCreated?.(saved);
    } catch (error) {
      addError({
        key: "schedule:edit",
        message: httpErrorToHuman(error),
      });
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(submit)}>
        <h3 className={"mb-2 text-2xl"}>
          {schedule ? "Edit schedule timing" : "Choose when to run"}
        </h3>
        <p className={"mb-6 text-sm text-neutral-300"}>
          {schedule
            ? "Update the timing and automatic run settings."
            : "First choose a time, then add the steps your server should follow."}
        </p>
        <FlashMessageRender byKey={"schedule:edit"} className={"mb-6"} />
        <FormField
          id={"name"}
          label={"Schedule name"}
          placeholder={"For example: Daily restart"}
          maxLength={191}
          error={methods.formState.errors.name}
          {...methods.register("name")}
        />
        <ScheduleTimingFields timezone={timezone} />
        <div
          className={
            "mt-6 rounded border border-neutral-600 bg-neutral-800 p-4"
          }
        >
          <Switch
            id={"onlyWhenOnline"}
            description={
              "Turn this off if one of your steps starts the server. This setting also applies to Run now."
            }
            label={"Skip when server is offline"}
            disabled={methods.formState.isSubmitting}
            {...methods.register("onlyWhenOnline")}
          />
        </div>
        <div
          className={
            "mt-4 rounded border border-neutral-600 bg-neutral-800 p-4"
          }
        >
          <Switch
            id={"enabled"}
            description={
              "New schedules start paused so you can add steps first. You can enable automatic runs from the schedule page."
            }
            label={"Run automatically"}
            disabled={methods.formState.isSubmitting}
            {...methods.register("enabled")}
          />
        </div>
        <div className={"mt-6 text-right"}>
          <Button
            className={"w-full sm:w-auto"}
            type={"submit"}
            disabled={methods.formState.isSubmitting}
          >
            {schedule ? "Save changes" : "Save timing & add steps"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

export default asModal<Props>()(EditScheduleModal);
