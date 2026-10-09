import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

const useId = React.useId;

const Field = ({ label }: { label: string }) => {
    const id = useId();

    return (
        <>
            <label htmlFor={id}>{label}</label>
            <input id={id} />
        </>
    );
};

describe('React useId compatibility', () => {
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

    it('preserves field IDs and label associations when a component updates', () => {
        act(() => {
            root.render(<Field label={'Verification code'} />);
        });
        const id = container.querySelector('input')!.id;

        act(() => {
            root.render(<Field label={'Updated verification code'} />);
        });

        expect(container.querySelector('input')!.id).toBe(id);
        expect(container.querySelector('label')!.htmlFor).toBe(id);
        expect(container.querySelector('label')!.textContent).toBe('Updated verification code');
    });

    it('gives different fields unique IDs without changing them on updates', () => {
        const fields = (label: string) => (
            <>
                <Field label={label} />
                <Field label={'Account password'} />
            </>
        );

        act(() => {
            root.render(fields('Verification code'));
        });
        const ids = Array.from(container.querySelectorAll('input'), (input) => input.id);
        expect(new Set(ids).size).toBe(2);

        act(() => {
            root.render(fields('Updated verification code'));
        });

        expect(Array.from(container.querySelectorAll('input'), (input) => input.id)).toEqual(ids);
    });
});
