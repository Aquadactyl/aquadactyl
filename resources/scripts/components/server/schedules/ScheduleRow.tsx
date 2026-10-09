import React from 'react';
import { Schedule } from '@/api/server/schedules/getServerSchedules';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames';
import { useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import { describeCron, formatScheduleDate } from './scheduleHelpers';

export default ({ schedule }: { schedule: Schedule }) => {
    const timezone = useStoreState((state: ApplicationStore) => state.settings.data?.timezone ?? 'UTC');
    return (
        <>
            <div className={'hidden md:block'}>
                <FontAwesomeIcon icon={faCalendarAlt} fixedWidth />
            </div>
            <div className={'min-w-0 flex-1 md:ml-4'}>
                <p className={'font-medium wrap-break-word'}>{schedule.name}</p>
                <p className={'mt-1 text-sm text-neutral-200'}>
                    {describeCron(schedule.cron)} · {timezone}
                </p>
                <p className={'mt-2 text-xs text-neutral-400'}>
                    {schedule.tasks.length} {schedule.tasks.length === 1 ? 'step' : 'steps'} · Last run:{' '}
                    {schedule.lastRunAt ? formatScheduleDate(schedule.lastRunAt, timezone) : 'Never'}
                </p>
                <p className={'mt-1 text-xs text-neutral-400'}>
                    {schedule.isActive
                        ? 'Next run: ' +
                          (schedule.nextRunAt ? formatScheduleDate(schedule.nextRunAt, timezone) : 'Not scheduled')
                        : 'Automatic runs are paused'}
                </p>
            </div>
            <span
                className={classNames(
                    'ml-3 rounded px-3 py-1 text-xs',
                    schedule.isProcessing
                        ? 'bg-primary-600 text-white'
                        : schedule.isActive
                          ? 'bg-green-700 text-white'
                          : 'bg-neutral-600 text-neutral-200',
                )}
            >
                {schedule.isProcessing ? 'Running' : schedule.isActive ? 'Enabled' : 'Paused'}
            </span>
        </>
    );
};
