import React from "react";
import { useFormContext } from "react-hook-form";
import FormField from "@/components/elements/FormField";
import FormFieldWrapper from "@/components/elements/FormFieldWrapper";
import Select from "@/components/elements/Select";
import ScheduleCheatsheetCards from "./ScheduleCheatsheetCards";
import {
  Cron,
  Frequency,
  Timing,
  cronFromTiming,
  describeCron,
  hourIntervals,
  minuteIntervals,
  weekdays,
} from "./scheduleHelpers";

export interface TimingValues extends Timing, Cron {}

export const ScheduleSelect = ({
  name,
  label,
  children,
  onChange,
}: {
  name: string;
  label: string;
  children: React.ReactNode;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
}) => {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const registration = register(name);
  const error = (errors as Record<string, any>)[name];

  return (
    <FormFieldWrapper id={`schedule-${name}`} label={label} error={error}>
      <Select
        id={`schedule-${name}`}
        {...registration}
        onChange={(e) => {
          registration.onChange(e);
          onChange?.(e);
        }}
      >
        {children}
      </Select>
    </FormFieldWrapper>
  );
};

export default ({ timezone }: { timezone: string }) => {
  const {
    watch,
    setValue,
    getValues,
    register,
    formState: { errors },
  } = useFormContext<TimingValues>();
  const values = watch();

  let preview = "Choose a valid time to see when this schedule will run.";
  try {
    preview = describeCron(cronFromTiming(values, values));
  } catch {
    // Incomplete time/number inputs are normal while editing.
  }

  return (
    <div className={"mt-6 space-y-4"}>
      <ScheduleSelect
        name={"frequency"}
        label={"How often?"}
        onChange={(event) => {
          const frequency = event.target.value as Frequency;
          let cron = {};
          if (frequency === "custom") {
            try {
              cron = cronFromTiming(values, values);
            } catch {
              /* Keep the existing cron if a basic input is incomplete. */
            }
          }
          const currentValues = getValues();
          const next = { ...currentValues, ...cron, frequency };
          Object.keys(next).forEach((key) => {
            setValue(key as any, (next as any)[key]);
          });
        }}
      >
        <option value={"minutes"}>Every few minutes</option>
        <option value={"hours"}>Every few hours</option>
        <option value={"daily"}>Every day</option>
        <option value={"weekly"}>Every week</option>
        <option value={"monthly"}>Every month</option>
        <option value={"custom"}>Custom cron (advanced)</option>
      </ScheduleSelect>
      {values.frequency === "minutes" && (
        <ScheduleSelect name={"minuteInterval"} label={"Run every"}>
          {minuteIntervals.map((interval) => (
            <option key={interval} value={interval}>
              {interval === 1 ? "1 minute" : `${interval} minutes`}
            </option>
          ))}
        </ScheduleSelect>
      )}
      {values.frequency === "hours" && (
        <div className={"grid gap-4 sm:grid-cols-2"}>
          <ScheduleSelect name={"hourInterval"} label={"Run every"}>
            {hourIntervals.map((interval) => (
              <option key={interval} value={interval}>
                {interval === 1 ? "1 hour" : `${interval} hours`}
              </option>
            ))}
          </ScheduleSelect>
          <FormField
            id={"schedule-hourMinute"}
            label={"Minutes past the hour"}
            type={"number"}
            min={0}
            max={59}
            step={1}
            error={errors.hourMinute}
            {...register("hourMinute")}
          />
        </div>
      )}
      {["daily", "weekly", "monthly"].includes(values.frequency) && (
        <div className={"grid gap-4 sm:grid-cols-2"}>
          {values.frequency === "weekly" && (
            <ScheduleSelect name={"weekday"} label={"Day of the week"}>
              {weekdays.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </ScheduleSelect>
          )}
          {values.frequency === "monthly" && (
            <ScheduleSelect name={"monthDay"} label={"Day of the month"}>
              {Array.from({ length: 31 }, (_, index) => (
                <option key={index} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </ScheduleSelect>
          )}
          <FormField
            id={"schedule-time"}
            label={"Time (24-hour)"}
            type={"time"}
            step={60}
            error={errors.time}
            {...register("time")}
          />
        </div>
      )}
      {values.frequency === "monthly" && Number(values.monthDay) > 28 && (
        <p className={"text-sm text-yellow-200"}>
          Months without day {values.monthDay} will be skipped.
        </p>
      )}
      {values.frequency === "custom" && (
        <>
          <div className={"grid grid-cols-2 gap-4 sm:grid-cols-3"}>
            <FormField
              id={"schedule-minute"}
              label={"Minute"}
              description={"0–59, or * for every minute"}
              error={errors.minute}
              {...register("minute")}
            />
            <FormField
              id={"schedule-hour"}
              label={"Hour"}
              description={"0–23, or * for every hour"}
              error={errors.hour}
              {...register("hour")}
            />
            <FormField
              id={"schedule-dayOfMonth"}
              label={"Day of month"}
              description={"1–31, or * for every day"}
              error={errors.dayOfMonth}
              {...register("dayOfMonth")}
            />
            <FormField
              id={"schedule-month"}
              label={"Month"}
              description={"1–12, or * for every month"}
              error={errors.month}
              {...register("month")}
            />
            <FormField
              id={"schedule-dayOfWeek"}
              label={"Day of week"}
              description={"0–6 (Sunday–Saturday), or *"}
              error={errors.dayOfWeek}
              {...register("dayOfWeek")}
            />
          </div>
          <details className={"rounded bg-neutral-800 p-4 text-sm"}>
            <summary className={"cursor-pointer"}>
              Cron examples and special characters
            </summary>
            <div className={"mt-4 md:flex"}>
              <ScheduleCheatsheetCards />
            </div>
          </details>
        </>
      )}
      <div
        className={"rounded border border-neutral-600 bg-neutral-800 p-4"}
        aria-live={"polite"}
      >
        <p className={"font-medium text-neutral-100"}>{preview}</p>
        <p className={"mt-1 text-sm text-neutral-300"}>
          Panel timezone: {timezone}. The next run is shown on the schedule page
          when enabled.
        </p>
        {values.frequency === "hours" && Number(values.hourInterval) > 1 && (
          <p className={"mt-2 text-xs text-neutral-400"}>
            Runs follow the clock, starting at midnight; the interval does not
            start when you save.
          </p>
        )}
      </div>
      {values.frequency !== "custom" && (
        <button
          type={"button"}
          className={
            "text-primary-300 hover:text-primary-200 cursor-pointer text-sm underline"
          }
          onClick={() => {
            try {
              const currentValues = getValues();
              const cron = cronFromTiming(currentValues, currentValues);
              const next = {
                ...currentValues,
                ...cron,
                frequency: "custom" as const,
              };
              Object.keys(next).forEach((key) => {
                setValue(key as any, (next as any)[key]);
              });
            } catch {
              // Keep invalid basic values visible so the user can finish editing them.
            }
          }}
        >
          Edit these times as advanced cron
        </button>
      )}
    </div>
  );
};
