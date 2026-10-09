import React, { useContext, useEffect } from 'react';
import { Schedule } from '@/api/server/schedules/getServerSchedules';
import Field from '@/components/elements/Field';
import { Form, Formik, FormikHelpers } from 'formik';
import FormikSwitch from '@/components/elements/FormikSwitch';
import createOrUpdateSchedule from '@/api/server/schedules/createOrUpdateSchedule';
import { ServerContext } from '@/state/server';
import { ApplicationStore } from '@/state';
import { useStoreState } from 'easy-peasy';
import { httpErrorToHuman } from '@/api/http';
import FlashMessageRender from '@/components/FlashMessageRender';
import useFlash from '@/plugins/useFlash';
import { Button } from '@/components/elements/button/index';
import ModalContext from '@/context/ModalContext';
import asModal from '@/hoc/asModal';
import ScheduleTimingFields, { TimingValues } from './ScheduleTimingFields';
import { cronFromTiming, defaultTiming, timingErrors, timingFromCron } from './scheduleHelpers';

interface Props {
    schedule?: Schedule;
    onCreated?: (schedule: Schedule) => void;
}

interface Values extends TimingValues {
    name: string;
    enabled: boolean;
    onlyWhenOnline: boolean;
}

const EditScheduleModal = ({ schedule, onCreated }: Props) => {
    const { addError, clearFlashes } = useFlash();
    const { dismiss } = useContext(ModalContext);
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const timezone = useStoreState((state: ApplicationStore) => state.settings.data?.timezone ?? 'UTC');
    const appendSchedule = ServerContext.useStoreActions((actions) => actions.schedules.appendSchedule);

    useEffect(() => () => clearFlashes('schedule:edit'), []);

    const submit = (values: Values, { setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes('schedule:edit');
        createOrUpdateSchedule(uuid, {
            id: schedule?.id,
            name: values.name.trim(),
            cron: cronFromTiming(values, values),
            onlyWhenOnline: values.onlyWhenOnline,
            isActive: values.enabled,
        })
            .then((saved) => {
                setSubmitting(false);
                appendSchedule(saved);
                dismiss();
                if (!schedule) onCreated?.(saved);
            })
            .catch((error) => {
                setSubmitting(false);
                addError({ key: 'schedule:edit', message: httpErrorToHuman(error) });
            });
    };

    return (
        <Formik<Values>
            onSubmit={submit}
            validate={(values) => ({
                ...timingErrors(values),
                ...(!values.name.trim() && { name: 'Give this schedule a name.' }),
                ...(values.name.trim().length > 191 && { name: 'Use a name with no more than 191 characters.' }),
                ...(values.frequency === 'custom' &&
                    Object.fromEntries(
                        ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek']
                            .filter((field) => !values[field as keyof TimingValues].trim())
                            .map((field) => [field, 'Enter a cron value, or * for any.']),
                    )),
            })}
            initialValues={{
                ...(schedule ? timingFromCron(schedule.cron) : defaultTiming),
                ...(schedule?.cron ?? { minute: '0', hour: '3', dayOfMonth: '*', month: '*', dayOfWeek: '*' }),
                name: schedule?.name || '',
                enabled: schedule?.isActive ?? false,
                onlyWhenOnline: schedule?.onlyWhenOnline ?? true,
            }}
        >
            {({ isSubmitting }) => (
                <Form>
                    <h3 className={'mb-2 text-2xl'}>{schedule ? 'Edit schedule timing' : 'Choose when to run'}</h3>
                    <p className={'mb-6 text-sm text-neutral-300'}>
                        {schedule
                            ? 'Update the timing and automatic run settings.'
                            : 'First choose a time, then add the steps your server should follow.'}
                    </p>
                    <FlashMessageRender byKey={'schedule:edit'} className={'mb-6'} />
                    <Field
                        name={'name'}
                        label={'Schedule name'}
                        placeholder={'For example: Daily restart'}
                        maxLength={191}
                    />
                    <ScheduleTimingFields timezone={timezone} />
                    <div className={'mt-6 rounded border border-neutral-600 bg-neutral-800 p-4'}>
                        <FormikSwitch
                            name={'onlyWhenOnline'}
                            description={
                                'Turn this off if one of your steps starts the server. This setting also applies to Run now.'
                            }
                            label={'Skip when server is offline'}
                        />
                    </div>
                    <div className={'mt-4 rounded border border-neutral-600 bg-neutral-800 p-4'}>
                        <FormikSwitch
                            name={'enabled'}
                            description={
                                'New schedules start paused so you can add steps first. You can enable automatic runs from the schedule page.'
                            }
                            label={'Run automatically'}
                        />
                    </div>
                    <div className={'mt-6 text-right'}>
                        <Button className={'w-full sm:w-auto'} type={'submit'} disabled={isSubmitting}>
                            {schedule ? 'Save changes' : 'Save timing & add steps'}
                        </Button>
                    </div>
                </Form>
            )}
        </Formik>
    );
};

export default asModal<Props>()(EditScheduleModal);
