import React, { useEffect, useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import getServerSchedule from '@/api/server/schedules/getServerSchedule';
import createOrUpdateSchedule from '@/api/server/schedules/createOrUpdateSchedule';
import Spinner from '@/components/elements/Spinner';
import FlashMessageRender from '@/components/FlashMessageRender';
import EditScheduleModal from '@/components/server/schedules/EditScheduleModal';
import NewTaskButton from '@/components/server/schedules/NewTaskButton';
import DeleteScheduleButton from '@/components/server/schedules/DeleteScheduleButton';
import Can from '@/components/elements/Can';
import useFlash from '@/plugins/useFlash';
import { ServerContext } from '@/state/server';
import PageContentBlock from '@/components/elements/PageContentBlock';
import classNames from 'classnames';
import { Button } from '@/components/elements/button/index';
import ScheduleTaskRow from '@/components/server/schedules/ScheduleTaskRow';
import isEqual from 'react-fast-compare';
import RunScheduleButton from '@/components/server/schedules/RunScheduleButton';
import { useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import { cronExpression, describeCron, formatScheduleDate } from './scheduleHelpers';

import BeforeEdit from '@blueprint/components/Server/Schedules/Edit/BeforeEdit';
import AfterEdit from '@blueprint/components/Server/Schedules/Edit/AfterEdit';

interface Params {
    id: string;
}

export default () => {
    const history = useHistory();
    const { id: scheduleId } = useParams<Params>();
    const id = ServerContext.useStoreState((state) => state.server.data!.id);
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const timezone = useStoreState((state: ApplicationStore) => state.settings.data?.timezone ?? 'UTC');
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const [isLoading, setIsLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [savingStatus, setSavingStatus] = useState(false);
    const schedule = ServerContext.useStoreState(
        (state) => state.schedules.data.find((s) => s.id === parseInt(scheduleId, 10)),
        isEqual,
    );
    const appendSchedule = ServerContext.useStoreActions((actions) => actions.schedules.appendSchedule);

    const toggleAutomaticRuns = () => {
        if (!schedule) return;
        clearFlashes('schedules');
        setSavingStatus(true);
        createOrUpdateSchedule(uuid, { ...schedule, isActive: !schedule.isActive })
            .then((saved) => appendSchedule(saved))
            .catch((error) => clearAndAddHttpError({ error, key: 'schedules' }))
            .finally(() => setSavingStatus(false));
    };

    useEffect(() => {
        if (schedule) {
            setIsLoading(false);
            return;
        }
        clearFlashes('schedules');
        getServerSchedule(uuid, parseInt(scheduleId, 10))
            .then((schedule) => appendSchedule(schedule))
            .catch((error) => clearAndAddHttpError({ error, key: 'schedules' }))
            .then(() => setIsLoading(false));
    }, [scheduleId]);

    return (
        <PageContentBlock title={'Schedules'}>
            <FlashMessageRender byKey={'schedules'} className={'mb-4'} />
            {!schedule || isLoading ? (
                <Spinner size={'large'} centered />
            ) : (
                <>
                    <BeforeEdit />
                    <Link
                        className={'text-primary-300 mb-4 inline-block text-sm hover:underline'}
                        to={'/server/' + id + '/schedules'}
                    >
                        &larr; All schedules
                    </Link>
                    <div className={'rounded bg-neutral-900 p-4 shadow-sm sm:p-6'}>
                        <div className={'flex flex-wrap items-start justify-between gap-4'}>
                            <div className={'min-w-0 flex-1'}>
                                <h3 className={'text-2xl wrap-break-word text-neutral-100'}>{schedule.name}</h3>
                                <p className={'mt-2 text-neutral-200'}>{describeCron(schedule.cron)}</p>
                                <p className={'mt-1 text-sm text-neutral-400'}>Panel timezone: {timezone}</p>
                            </div>
                            <span
                                className={classNames(
                                    'rounded-full px-3 py-1 text-xs',
                                    schedule.isProcessing
                                        ? 'bg-primary-600 text-white'
                                        : schedule.isActive
                                          ? 'bg-green-700 text-white'
                                          : 'bg-neutral-600 text-neutral-200',
                                )}
                            >
                                {schedule.isProcessing ? 'Running' : schedule.isActive ? 'Enabled' : 'Paused'}
                            </span>
                        </div>
                        <div className={'mt-5 grid gap-3 text-sm sm:grid-cols-2'}>
                            <div className={'rounded bg-neutral-800 p-3'}>
                                <p className={'text-neutral-400'}>Last run</p>
                                <p className={'mt-1'}>
                                    {schedule.lastRunAt ? formatScheduleDate(schedule.lastRunAt, timezone) : 'Never'}
                                </p>
                            </div>
                            <div className={'rounded bg-neutral-800 p-3'}>
                                <p className={'text-neutral-400'}>Next run</p>
                                <p className={'mt-1'}>
                                    {!schedule.isActive
                                        ? 'Paused'
                                        : schedule.nextRunAt
                                          ? formatScheduleDate(schedule.nextRunAt, timezone)
                                          : 'Not scheduled'}
                                </p>
                            </div>
                        </div>
                        <p className={'mt-4 text-sm text-neutral-300'}>
                            {schedule.isActive ? 'Automatic runs are enabled.' : 'Automatic runs are paused.'}{' '}
                            {schedule.onlyWhenOnline
                                ? 'Runs are skipped when the server is offline.'
                                : 'Runs can start while the server is offline.'}
                        </p>
                        <details className={'mt-4 text-sm text-neutral-400'}>
                            <summary className={'cursor-pointer'}>View cron expression</summary>
                            <code className={'mt-2 block break-all'}>{cronExpression(schedule.cron)}</code>
                            <p className={'mt-1 text-xs'}>Minute · Hour · Day of month · Month · Day of week</p>
                        </details>
                        <Can action={'schedule.update'}>
                            <div className={'mt-5 flex flex-wrap gap-3'}>
                                <Button.Text onClick={() => setShowEditModal(true)}>Edit timing</Button.Text>
                                {(schedule.tasks.length > 0 || schedule.isActive) && (
                                    <Button.Text
                                        disabled={savingStatus || schedule.isProcessing}
                                        onClick={toggleAutomaticRuns}
                                    >
                                        {savingStatus
                                            ? 'Saving…'
                                            : schedule.isActive
                                              ? 'Pause schedule'
                                              : 'Enable schedule'}
                                    </Button.Text>
                                )}
                                {schedule.tasks.length > 0 && <NewTaskButton schedule={schedule} />}
                            </div>
                        </Can>
                    </div>
                    <div className={'mt-6'}>
                        <h3 className={'mb-2 text-lg'}>Steps</h3>
                        <p className={'mb-4 text-sm text-neutral-400'}>
                            Actions are sent in order. Add a wait between steps to give a restart or backup time to
                            finish.
                        </p>
                        <div className={'rounded bg-neutral-700'}>
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
                                <div className={'p-6 text-center'}>
                                    <h4 className={'text-lg'}>Add the first step</h4>
                                    <p className={'mt-2 mb-5 text-sm text-neutral-300'}>
                                        The timing is saved. Choose a restart, a backup, or a console command to give
                                        this schedule something to do.
                                    </p>
                                    <Can action={'schedule.update'}>
                                        <NewTaskButton schedule={schedule} label={'Add first step'} />
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
                    <div className={'mt-6 flex flex-wrap gap-y-3 sm:justify-end'}>
                        <Can action={'schedule.delete'}>
                            <DeleteScheduleButton
                                scheduleId={schedule.id}
                                onDeleted={() => history.push('/server/' + id + '/schedules')}
                            />
                        </Can>
                        {schedule.tasks.length > 0 && (
                            <Can action={'schedule.update'}>
                                <RunScheduleButton schedule={schedule} />
                            </Can>
                        )}
                    </div>
                    {schedule.tasks.length > 0 && (
                        <p className={'mt-3 text-sm text-neutral-400 sm:text-right'}>
                            Run now works even when automatic runs are paused. It still respects the offline setting.
                        </p>
                    )}
                    <AfterEdit />
                </>
            )}
        </PageContentBlock>
    );
};
