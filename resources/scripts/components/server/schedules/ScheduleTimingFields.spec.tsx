import React from 'react';
import ReactDOM from 'react-dom';
import { act, Simulate } from 'react-dom/test-utils';
import { Form, Formik } from 'formik';
import ScheduleTimingFields, { TimingValues } from './ScheduleTimingFields';
import { cronFromTiming, defaultTiming } from './scheduleHelpers';

describe('schedule timing editor', () => {
    let container: HTMLDivElement;
    const save = vi.fn();

    beforeEach(() => {
        save.mockClear();
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        act(() => {
            ReactDOM.unmountComponentAtNode(container);
        });
        container.remove();
    });

    const render = (changes: Partial<TimingValues> = {}) => {
        act(() => {
            ReactDOM.render(
                <Formik<TimingValues>
                    initialValues={{
                        ...defaultTiming,
                        minute: '0',
                        hour: '3',
                        dayOfMonth: '*',
                        month: '*',
                        dayOfWeek: '*',
                        ...changes,
                    }}
                    onSubmit={(values) => save(cronFromTiming(values, values))}
                >
                    <Form>
                        <ScheduleTimingFields timezone={'Europe/London'} />
                        <button type={'submit'}>Save</button>
                    </Form>
                </Formik>,
                container,
            );
        });
    };

    const click = (element: Element) => {
        for (const type of ['mousedown', 'mouseup', 'click']) {
            element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 }));
        }
    };
    const choose = async (name: string, label: string) => {
        await act(async () => {
            click(
                container
                    .querySelector(`[id="schedule-${name}"]`)!
                    .closest('.panel-select')!
                    .querySelector('.panel-select__control')!,
            );
        });
        await act(async () => {
            click(
                Array.from(document.querySelectorAll('[role="option"]')).find(
                    (option) => option.textContent === label,
                )!,
            );
        });
    };
    const submit = async () => {
        await act(async () => {
            Simulate.submit(container.querySelector('form')!);
        });
    };

    it('carries a changed basic time into the advanced dropdown and API fields', async () => {
        render();
        await act(async () => {
            Simulate.change(container.querySelector('input[name="time"]')!, {
                target: { name: 'time', value: '21:15' },
            } as any);
        });
        expect(container.textContent).toContain('Every day at 21:15');
        expect(container.textContent).toContain('Panel timezone: Europe/London');
        await choose('frequency', 'Custom cron (advanced)');
        expect(container.querySelector<HTMLInputElement>('input[name="minute"]')!.value).toBe('15');
        expect(container.querySelector<HTMLInputElement>('input[name="hour"]')!.value).toBe('21');
        await submit();
        expect(save).toHaveBeenCalledWith({ minute: '15', hour: '21', dayOfMonth: '*', month: '*', dayOfWeek: '*' });
    });

    it('preserves advanced expressions when saving without timing edits', async () => {
        render({
            frequency: 'custom',
            minute: '0,30',
            hour: '6,18',
            dayOfWeek: 'MON-FRI',
            month: 'JAN,JUN',
            dayOfMonth: '*',
        });
        await submit();
        expect(save).toHaveBeenCalledWith({
            minute: '0,30',
            hour: '6,18',
            dayOfWeek: 'MON-FRI',
            month: 'JAN,JUN',
            dayOfMonth: '*',
        });
    });

    it('explains skipped months for a monthly day that does not exist in every month', async () => {
        render();
        await choose('frequency', 'Every month');
        await choose('monthDay', '31');
        expect(container.textContent).toContain('Months without day 31 will be skipped.');
        await submit();
        expect(save).toHaveBeenCalledWith({ minute: '0', hour: '3', dayOfMonth: '31', month: '*', dayOfWeek: '*' });
    });
});
