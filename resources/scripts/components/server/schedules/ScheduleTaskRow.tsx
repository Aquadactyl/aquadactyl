import React, { useState } from 'react';
import { Schedule, Task } from '@/api/server/schedules/getServerSchedules';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowCircleDown,
    faCode,
    faFileArchive,
    faPencilAlt,
    faToggleOn,
    faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';
import deleteScheduleTask from '@/api/server/schedules/deleteScheduleTask';
import { httpErrorToHuman } from '@/api/http';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import TaskDetailsModal from '@/components/server/schedules/TaskDetailsModal';
import Can from '@/components/elements/Can';
import useFlash from '@/plugins/useFlash';
import { ServerContext } from '@/state/server';
import ConfirmationModal from '@/components/elements/ConfirmationModal';
import Icon from '@/components/elements/Icon';
import { describeDelay, taskKind, taskKinds } from './scheduleHelpers';

interface Props {
    schedule: Schedule;
    task: Task;
    stepNumber?: number;
}

const getActionDetails = (action: string): [string, any] => {
    switch (action) {
        case 'command':
            return ['Send Command', faCode];
        case 'power':
            return ['Send Power Action', faToggleOn];
        case 'backup':
            return ['Create Backup', faFileArchive];
        default:
            return ['Unknown Action', faCode];
    }
};

export default ({ schedule, task, stepNumber = task.sequenceId }: Props) => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { clearFlashes, addError } = useFlash();
    const [visible, setVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const appendSchedule = ServerContext.useStoreActions((actions) => actions.schedules.appendSchedule);

    const onConfirmDeletion = () => {
        setIsLoading(true);
        clearFlashes('schedules');
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
                addError({ message: httpErrorToHuman(error), key: 'schedules' });
            });
    };

    const [fallbackTitle, icon] = getActionDetails(task.action);
    const title = taskKinds[taskKind(task)] ?? fallbackTitle;

    return (
        <div className={'items-center border-b border-neutral-800 p-3 sm:flex sm:p-6'}>
            <SpinnerOverlay visible={isLoading} fixed size={'large'} />
            <TaskDetailsModal
                schedule={schedule}
                task={task}
                visible={isEditing}
                onModalDismissed={() => setIsEditing(false)}
            />
            <ConfirmationModal
                title={'Confirm task deletion'}
                buttonText={'Delete Task'}
                onConfirmed={onConfirmDeletion}
                visible={visible}
                onModalDismissed={() => setVisible(false)}
            >
                Are you sure you want to delete this task? This action cannot be undone.
            </ConfirmationModal>
            <FontAwesomeIcon icon={icon} className={'hidden text-lg text-white md:block'} />
            <div className={'w-full min-w-0 flex-none sm:w-auto sm:flex-1'}>
                <p className={'text-sm font-medium text-neutral-100 md:ml-6'}>
                    Step {stepNumber} · {title}
                </p>
                <p className={'mt-1 text-xs text-neutral-300 md:ml-6'}>
                    {describeDelay(task.timeOffset)}
                    {stepNumber === 1 ? ' before starting' : ' after the previous action is sent'}
                </p>
                {task.payload && task.action !== 'power' && (
                    <div className={'mt-2 md:ml-6'}>
                        {task.action === 'backup' && (
                            <p className={'mb-1 text-xs text-neutral-400 uppercase'}>Ignoring files & folders:</p>
                        )}
                        <div
                            className={
                                'inline-block w-auto rounded bg-neutral-800 px-2 py-1 font-mono text-sm break-all whitespace-pre-wrap'
                            }
                        >
                            {task.payload}
                        </div>
                    </div>
                )}
            </div>
            <div className={'mt-3 flex w-full flex-wrap items-center gap-y-2 sm:mt-0 sm:ml-4 sm:w-auto'}>
                {task.continueOnFailure && (
                    <div className={'mr-6'}>
                        <div
                            className={'flex items-center rounded-full bg-yellow-500 px-2 py-1 text-sm text-yellow-800'}
                        >
                            <Icon icon={faArrowCircleDown} className={'mr-2 h-3 w-3'} />
                            Keeps going on connection failure
                        </div>
                    </div>
                )}
                <Can action={'schedule.update'}>
                    <button
                        type={'button'}
                        aria-label={'Edit scheduled task'}
                        className={
                            'mr-4 ml-auto block cursor-pointer p-2 text-sm text-neutral-500 transition-colors duration-150 hover:text-neutral-100 sm:ml-0'
                        }
                        onClick={() => setIsEditing(true)}
                    >
                        <FontAwesomeIcon icon={faPencilAlt} />
                    </button>
                </Can>
                <Can action={'schedule.update'}>
                    <button
                        type={'button'}
                        aria-label={'Delete scheduled task'}
                        className={
                            'block cursor-pointer p-2 text-sm text-neutral-500 transition-colors duration-150 hover:text-red-600'
                        }
                        onClick={() => setVisible(true)}
                    >
                        <FontAwesomeIcon icon={faTrashAlt} />
                    </button>
                </Can>
            </div>
        </div>
    );
};
