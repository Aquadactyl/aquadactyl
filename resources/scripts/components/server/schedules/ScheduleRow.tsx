import React from 'react';
import { Schedule } from '@/api/server/schedules/getServerSchedules';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import { format } from 'date-fns';
import classNames from 'classnames';
import ScheduleCronRow from '@/components/server/schedules/ScheduleCronRow';

export default ({ schedule }: { schedule: Schedule }) => (
    <>
        <div className={'hidden md:block'}>
            <FontAwesomeIcon icon={faCalendarAlt} fixedWidth />
        </div>
        <div className={'flex-1 md:ml-4'}>
            <p>{schedule.name}</p>
            <p className={'text-xs text-neutral-400'}>
                Last run at: {schedule.lastRunAt ? format(schedule.lastRunAt, "MMM do 'at' h:mma") : 'never'}
            </p>
        </div>
        <div>
            <p
                className={classNames(
                    'rounded px-3 py-1 text-xs uppercase text-white sm:hidden',
                    schedule.isActive ? 'bg-green-600' : 'bg-neutral-400',
                )}
            >
                {schedule.isActive ? 'Active' : 'Inactive'}
            </p>
        </div>
        <ScheduleCronRow cron={schedule.cron} className={'mx-auto mt-4 w-full sm:mx-8 sm:mt-0 sm:w-auto'} />
        <div>
            <p
                className={classNames(
                    'hidden rounded px-3 py-1 text-xs uppercase text-white sm:block',
                    schedule.isActive && !schedule.isProcessing ? 'bg-green-600' : 'bg-neutral-400',
                )}
            >
                {schedule.isProcessing ? 'Processing' : schedule.isActive ? 'Active' : 'Inactive'}
            </p>
        </div>
    </>
);
