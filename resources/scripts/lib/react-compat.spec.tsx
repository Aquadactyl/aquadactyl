import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';

const useId = (React as typeof React & { useId: () => string }).useId;

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

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        act(() => {
            ReactDOM.unmountComponentAtNode(container);
        });
        container.remove();
    });

    it('preserves field IDs and label associations when a component updates', () => {
        act(() => {
            ReactDOM.render(<Field label={'Verification code'} />, container);
        });
        const id = container.querySelector('input')!.id;

        act(() => {
            ReactDOM.render(<Field label={'Updated verification code'} />, container);
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
            ReactDOM.render(fields('Verification code'), container);
        });
        const ids = Array.from(container.querySelectorAll('input'), (input) => input.id);
        expect(new Set(ids).size).toBe(2);

        act(() => {
            ReactDOM.render(fields('Updated verification code'), container);
        });

        expect(Array.from(container.querySelectorAll('input'), (input) => input.id)).toEqual(ids);
    });
});
