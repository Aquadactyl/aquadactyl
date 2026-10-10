import type { Schedule, Task } from '@/api/server/schedules/getServerSchedules';

export type Cron = Schedule['cron'];
export type Frequency =
  | 'minutes'
  | 'hours'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'custom';
export interface Timing {
  frequency: Frequency;
  minuteInterval: string;
  hourInterval: string;
  hourMinute: string;
  time: string;
  weekday: string;
  monthDay: string;
}

// Only offer intervals that divide evenly into the cron hour/day boundaries.
export const minuteIntervals = [1, 5, 10, 15, 20, 30];
export const hourIntervals = [1, 2, 3, 4, 6, 8, 12];
export const weekdays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
export const defaultTiming: Timing = {
  frequency: 'daily',
  minuteInterval: '15',
  hourInterval: '1',
  hourMinute: '0',
  time: '03:00',
  weekday: '1',
  monthDay: '1',
};

const isIntegerInRange = (value: string, min: number, max: number) =>
  /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max;
const interval = (value: string, allowed: number[]) => {
  if (value === '*') return 1;
  const match = /^\*\/(\d+)$/.exec(value);
  return match && allowed.includes(Number(match[1]))
    ? Number(match[1])
    : undefined;
};

export const timingFromCron = (cron: Cron): Timing => {
  const timing = { ...defaultTiming, frequency: 'custom' as Frequency };
  if (cron.month !== '*') return timing;
  const everyDay = cron.dayOfMonth === '*' && cron.dayOfWeek === '*';
  const minutes = interval(cron.minute, minuteIntervals);
  if (everyDay && cron.hour === '*' && minutes !== undefined) {
    return {
      ...timing,
      frequency: 'minutes',
      minuteInterval: String(minutes),
    };
  }
  if (!isIntegerInRange(cron.minute, 0, 59)) return timing;
  const hours = interval(cron.hour, hourIntervals);
  if (everyDay && hours !== undefined) {
    return {
      ...timing,
      frequency: 'hours',
      hourInterval: String(hours),
      hourMinute: cron.minute,
    };
  }
  if (!isIntegerInRange(cron.hour, 0, 23)) return timing;
  const time = `${cron.hour.padStart(2, '0')}:${cron.minute.padStart(2, '0')}`;
  if (everyDay) return { ...timing, frequency: 'daily', time };
  if (cron.dayOfMonth === '*' && isIntegerInRange(cron.dayOfWeek, 0, 7)) {
    return {
      ...timing,
      frequency: 'weekly',
      time,
      weekday: String(Number(cron.dayOfWeek) % 7),
    };
  }
  if (cron.dayOfWeek === '*' && isIntegerInRange(cron.dayOfMonth, 1, 31)) {
    return {
      ...timing,
      frequency: 'monthly',
      time,
      monthDay: cron.dayOfMonth,
    };
  }
  return timing;
};

export const timingErrors = (
  timing: Timing,
): Partial<Record<keyof Timing, string>> => {
  switch (timing.frequency) {
    case 'minutes':
      return minuteIntervals.includes(Number(timing.minuteInterval))
        ? {}
        : { minuteInterval: 'Choose a minute interval from the list.' };
    case 'hours':
      return {
        ...(!hourIntervals.includes(Number(timing.hourInterval)) && {
          hourInterval: 'Choose an hour interval from the list.',
        }),
        ...(!isIntegerInRange(timing.hourMinute, 0, 59) && {
          hourMinute: 'Enter a whole number from 0 to 59.',
        }),
      };
    case 'daily':
    case 'weekly':
    case 'monthly':
      return {
        ...(!/^([01]\d|2[0-3]):[0-5]\d$/.test(timing.time) && {
          time: 'Choose a time in 24-hour format, such as 03:00.',
        }),
        ...(timing.frequency === 'weekly' &&
          !isIntegerInRange(timing.weekday, 0, 6) && {
            weekday: 'Choose a day of the week.',
          }),
        ...(timing.frequency === 'monthly' &&
          !isIntegerInRange(timing.monthDay, 1, 31) && {
            monthDay: 'Choose a day from 1 to 31.',
          }),
      };
    case 'custom':
      return {};
    default:
      return { frequency: 'Choose how often this schedule should run.' };
  }
};

export const cronFromTiming = (timing: Timing, custom: Cron): Cron => {
  const errors = Object.values(timingErrors(timing));
  if (errors.length) throw new Error(errors[0]);
  if (timing.frequency === 'custom') {
    const { minute, hour, dayOfMonth, month, dayOfWeek } = custom;
    return { minute, hour, dayOfMonth, month, dayOfWeek };
  }
  const cron: Cron = {
    minute: '0',
    hour: '*',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
  };
  if (timing.frequency === 'minutes') {
    cron.minute =
      Number(timing.minuteInterval) === 1 ? '*' : `*/${timing.minuteInterval}`;
  } else if (timing.frequency === 'hours') {
    cron.minute = String(Number(timing.hourMinute));
    cron.hour =
      Number(timing.hourInterval) === 1 ? '*' : `*/${timing.hourInterval}`;
  } else {
    const [hour, minute] = timing.time.split(':');
    cron.hour = String(Number(hour));
    cron.minute = String(Number(minute));
    if (timing.frequency === 'weekly') cron.dayOfWeek = timing.weekday;
    if (timing.frequency === 'monthly') cron.dayOfMonth = timing.monthDay;
  }
  return cron;
};

export const describeCron = (cron: Cron): string => {
  const timing = timingFromCron(cron);
  switch (timing.frequency) {
    case 'minutes':
      return Number(timing.minuteInterval) === 1
        ? 'Every minute'
        : `Every ${timing.minuteInterval} minutes`;
    case 'hours':
      return `${Number(timing.hourInterval) === 1 ? 'Every hour' : `Every ${timing.hourInterval} hours`}, at ${Number(timing.hourMinute)} minutes past the hour`;
    case 'daily':
      return `Every day at ${timing.time}`;
    case 'weekly':
      return `Every ${weekdays[Number(timing.weekday)]} at ${timing.time}`;
    case 'monthly':
      return `On day ${Number(timing.monthDay)} of each month at ${timing.time}`;
    default:
      return 'Custom timing (advanced cron)';
  }
};

export const cronExpression = (cron: Cron) =>
  [cron.minute, cron.hour, cron.dayOfMonth, cron.month, cron.dayOfWeek].join(
    ' ',
  );

export const formatScheduleDate = (date: Date, timezone: string) => {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date);
  } catch {
    return `${date.toISOString().replace('T', ' ').slice(0, 16)} UTC`;
  }
};

export const taskKinds = {
  restart: 'Restart server',
  start: 'Start server',
  stop: 'Stop server',
  kill: 'Force stop server',
  command: 'Send console command',
  backup: 'Create backup',
};
export type TaskKind = keyof typeof taskKinds;
export type DelayUnit = 'seconds' | 'minutes';
export const taskKind = (task?: Pick<Task, 'action' | 'payload'>): TaskKind =>
  task?.action === 'power'
    ? (task.payload as TaskKind)
    : task?.action === 'backup'
      ? 'backup'
      : 'command';
export const taskData = (kind: TaskKind, payload: string) =>
  kind === 'command' || kind === 'backup'
    ? { action: kind, payload }
    : { action: 'power', payload: kind };
export const delayToSeconds = (amount: string, unit: DelayUnit): number => {
  const seconds = Number(amount) * (unit === 'minutes' ? 60 : 1);
  if (!/^\d+$/.test(amount) || seconds > 900)
    throw new Error('Choose a whole number up to 15 minutes (900 seconds).');
  return seconds;
};
export const delayFromSeconds = (
  seconds: number,
): { delay: string; delayUnit: DelayUnit } =>
  seconds > 0 && seconds % 60 === 0
    ? { delay: String(seconds / 60), delayUnit: 'minutes' }
    : { delay: String(seconds), delayUnit: 'seconds' };
export const describeDelay = (seconds: number) => {
  if (seconds === 0) return 'No wait';
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `Wait ${[
    minutes && `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`,
    remaining && `${remaining} ${remaining === 1 ? 'second' : 'seconds'}`,
  ]
    .filter(Boolean)
    .join(' ')}`;
};
