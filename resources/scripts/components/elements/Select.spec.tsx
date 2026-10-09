import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import Select, { SelectProps } from './Select';

describe('Select interactions inside a label', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    const renderSelect = (props: SelectProps = {}) => {
        act(() => {
            root.render(
                <form>
                    <label>
                        Time range
                        <Select name={'period'} aria-label={'Time range'} defaultValue={''} {...props}>
                            <option value={''}>All time</option>
                            <option value={'7d'}>Last 7 days</option>
                            <option value={'30d'}>Last 30 days</option>
                        </Select>
                    </label>
                </form>,
            );
        });
    };

    const click = (element: Element) => {
        for (const type of ['mousedown', 'mouseup', 'click']) {
            act(() => {
                element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 }));
            });
        }
    };

    it.each(['control', 'dropdown-indicator'])('keeps the menu open after clicking the %s', (target) => {
        const nativeClick = vi.fn();
        renderSelect({ onClick: () => nativeClick() });

        click(container.querySelector(`.panel-select__${target}`)!);

        const input = container.querySelector('[role="combobox"]')!;
        expect(input.getAttribute('aria-expanded')).toBe('true');
        expect(document.activeElement).toBe(input);
        expect(nativeClick).not.toHaveBeenCalled();
    });

    it('keeps option selection connected to native change events and form values', () => {
        const changes: string[] = [];
        renderSelect({ onChange: (event) => changes.push(event.currentTarget.value) });
        click(container.querySelector('.panel-select__dropdown-indicator')!);

        const option = Array.from(document.querySelectorAll('[role="option"]')).find(
            (element) => element.textContent === 'Last 7 days',
        )!;
        click(option);

        expect(changes).toEqual(['7d']);
        expect(new FormData(container.querySelector('form')!).get('period')).toBe('7d');
        expect(container.querySelector('[role="combobox"]')!.getAttribute('aria-expanded')).toBe('false');
    });

    it('preserves keyboard selection and Escape dismissal', () => {
        renderSelect();
        const input = container.querySelector<HTMLInputElement>('[role="combobox"]')!;
        act(() => input.focus());

        for (const key of ['ArrowDown', 'ArrowDown', 'Enter']) {
            act(() => {
                input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
            });
        }
        expect(new FormData(container.querySelector('form')!).get('period')).toBe('7d');

        for (const key of ['ArrowDown', 'Escape']) {
            act(() => {
                input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
            });
        }
        expect(input.getAttribute('aria-expanded')).toBe('false');
    });

    it('autofocuses the visible input with a mounted native target for form callbacks', () => {
        const targets: EventTarget[] = [];
        renderSelect({ autoFocus: true, onFocus: (event) => targets.push(event.currentTarget) });

        expect(document.activeElement).toBe(container.querySelector('[role="combobox"]'));
        expect(targets).toEqual([container.querySelector('select')]);
    });
});
