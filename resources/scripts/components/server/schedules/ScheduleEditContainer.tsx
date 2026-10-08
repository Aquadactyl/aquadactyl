import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import getServerSchedule from '@/api/server/schedules/getServerSchedule';
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
import { format } from 'date-fns';
import ScheduleCronRow from '@/components/server/schedules/ScheduleCronRow';
import RunScheduleButton from '@/components/server/schedules/RunScheduleButton';

import BeforeEdit from '@blueprint/components/Server/Schedules/Edit/BeforeEdit';
import AfterEdit from '@blueprint/components/Server/Schedules/Edit/AfterEdit';

interface Params {
    id: string;
}

const CronBox = ({ title, value }: { title: string; value: string }) => (
    <div className={'rounded bg-neutral-700 p-3'}>
        <p className={'text-sm text-neutral-300'}>{title}</p>
        <p className={'text-xl font-medium text-neutral-100'}>{value}</p>
    </div>
);

const ActivePill = ({ active }: { active: boolean }) => (
    <span
        className={classNames(
            'ml-4 rounded-full px-2 py-px text-xs uppercase',
            active ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100',
        )}
    >
        {active ? 'Active' : 'Inactive'}
    </span>
);

export default () => {
    const history = useHistory();
    const { id: scheduleId } = useParams<Params>();

    const id = ServerContext.useStoreState((state) => state.server.data!.id);
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);

    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const [isLoading, setIsLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);

    const schedule = ServerContext.useStoreState(
        (state) => state.schedules.data.find((s) => s.id === parseInt(scheduleId, 10)),
        isEqual,
    );
    const appendSchedule = ServerContext.useStoreActions((actions) => actions.schedules.appendSchedule);

    useEffect(() => {
        if (schedule) {
            setIsLoading(false);
            return;
        }

        clearFlashes('schedules');
        getServerSchedule(uuid, parseInt(scheduleId, 10))
            .then((schedule) => appendSchedule(schedule))
            .catch((error) => {
                console.error(error);
                clearAndAddHttpError({ error, key: 'schedules' });
            })
            .then(() => setIsLoading(false));
    }, [scheduleId]);

    const toggleEditModal = useCallback(() => {
        setShowEditModal((s) => !s);
    }, []);

    return (
        <PageContentBlock title={'Schedules'}>
            <FlashMessageRender byKey={'schedules'} className={'mb-4'} />
            {!schedule || isLoading ? (
                <Spinner size={'large'} centered />
            ) : (
                <>
                    <BeforeEdit />
                    <ScheduleCronRow cron={schedule.cron} className={'mb-4 rounded bg-neutral-700 p-3 sm:hidden'} />
                    <div className={'rounded shadow'}>
                        <div
                            className={
                                'items-center rounded-t border-b-4 border-neutral-600 bg-neutral-900 p-3 sm:flex sm:p-6'
                            }
                        >
                            <div className={'flex-1'}>
                                <h3 className={'flex items-center text-2xl text-neutral-100'}>
                                    {schedule.name}
                                    {schedule.isProcessing ? (
                                        <span
                                            className={
                                                'ml-4 flex items-center rounded-full bg-neutral-600 px-2 py-px text-xs uppercase text-white'
                                            }
                                        >
                                            <Spinner className={'mr-2 !h-3 !w-3'} />
                                            Processing
                                        </span>
                                    ) : (
                                        <ActivePill active={schedule.isActive} />
                                    )}
                                </h3>
                                <p className={'mt-1 text-sm text-neutral-200'}>
                                    Last run at:&nbsp;
                                    {schedule.lastRunAt ? (
                                        format(schedule.lastRunAt, "MMM do 'at' h:mma")
                                    ) : (
                                        <span className={'text-neutral-300'}>n/a</span>
                                    )}
                                    <span className={'ml-4 border-l-4 border-neutral-600 py-px pl-4'}>
                                        Next run at:&nbsp;
                                        {schedule.nextRunAt ? (
                                            format(schedule.nextRunAt, "MMM do 'at' h:mma")
                                        ) : (
                                            <span className={'text-neutral-300'}>n/a</span>
                                        )}
                                    </span>
                                </p>
                            </div>
                            <div className={'mt-3 flex sm:mt-0 sm:block'}>
                                <Can action={'schedule.update'}>
                                    <Button.Text className={'mr-4 flex-1'} onClick={toggleEditModal}>
                                        Edit
                                    </Button.Text>
                                    <NewTaskButton schedule={schedule} />
                                </Can>
                            </div>
                        </div>
                        <div className={'mb-4 mt-4 hidden grid-cols-5 gap-4 sm:grid md:grid-cols-5'}>
                            <CronBox title={'Minute'} value={schedule.cron.minute} />
                            <CronBox title={'Hour'} value={schedule.cron.hour} />
                            <CronBox title={'Day (Month)'} value={schedule.cron.dayOfMonth} />
                            <CronBox title={'Month'} value={schedule.cron.month} />
                            <CronBox title={'Day (Week)'} value={schedule.cron.dayOfWeek} />
                        </div>
                        <div className={'rounded-b bg-neutral-700'}>
                            {schedule.tasks.length > 0
                                ? schedule.tasks
                                      .sort((a, b) =>
                                          a.sequenceId === b.sequenceId ? 0 : a.sequenceId > b.sequenceId ? 1 : -1,
                                      )
                                      .map((task) => (
                                          <ScheduleTaskRow
                                              key={`${schedule.id}_${task.id}`}
                                              task={task}
                                              schedule={schedule}
                                          />
                                      ))
                                : null}
                        </div>
                    </div>
                    <EditScheduleModal visible={showEditModal} schedule={schedule} onModalDismissed={toggleEditModal} />
                    <div className={'mt-6 flex sm:justify-end'}>
                        <Can action={'schedule.delete'}>
                            <DeleteScheduleButton
                                scheduleId={schedule.id}
                                onDeleted={() => history.push(`/server/${id}/schedules`)}
                            />
                        </Can>
                        {schedule.tasks.length > 0 && (
                            <Can action={'schedule.update'}>
                                <RunScheduleButton schedule={schedule} />
                            </Can>
                        )}
                    </div>
                    <AfterEdit />
                </>
            )}
        </PageContentBlock>
    );
};
