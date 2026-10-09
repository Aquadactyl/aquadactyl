# Using server schedules

Open **Schedules** on your server and select **Create schedule**. Give it a name,
choose how often it should run, and select **Save timing & add steps**. On the
next page, select **Add first step** and choose what your server should do.
New schedules start paused. Once you have added the steps, select **Enable
schedule** to start automatic runs. **Pause schedule** stops future automatic runs.

You can schedule a restart, start, stop, force stop, console command, or backup.
Backups require an available backup allowance on the server. If the allowance is
full, a scheduled backup replaces the oldest backup.

## Choosing a time

The basic editor offers intervals in minutes or hours, plus daily, weekly, and
monthly times. All times use the **panel timezone**, shown beside the timing
summary. They do not use your browser's timezone. The next run displayed on the
schedule page comes from the panel's scheduler.

Intervals follow the clock: every four hours at minute 20 runs at 00:20, 04:20,
08:20, and so on. Saving at 01:00 does not move that pattern. A monthly schedule
on day 31 skips months without that date. Local clock times follow the timezone's
daylight saving rules.

Select **Custom cron (advanced)** for more complex timing. Existing advanced
schedules keep their original cron fields when opened and saved. The advanced
editor includes examples, and the schedule page can show the full expression.

## Adding steps

Steps send their actions in order. **Wait before this step** accepts seconds or
whole minutes, up to 15 minutes per step. For example, to warn players before a
restart:

1. Add **Send console command**, enter `say Server restarting in 5 minutes`,
   and leave the wait at 0.
2. Add **Restart server** with a wait of 5 minutes.

Waiting starts when the previous action is sent, not when a restart or backup
finishes. Add enough time for that action to complete before sending the next
one. Automatic runs also apply a wait before the first step. **Run now** starts
the first step immediately and still applies waits before later steps.

**Keep going if this step fails** allows later steps after an error contacting
the server daemon; it does not handle every type of failure.

## Offline servers and pausing

**Skip when server is offline** is on by default. Turn it off for a schedule
that should start an offline server. This setting applies to **Run now** too.

Turn off **Run automatically** to pause the schedule while you configure its
steps. **Run now** remains available once the schedule has at least one step.
Creating a schedule without steps does not send any server actions.
