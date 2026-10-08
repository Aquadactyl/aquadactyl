import React from 'react';
import classNames from 'classnames';

interface AlertProps {
    type: 'warning' | 'danger' | 'info';
    className?: string;
    children: React.ReactNode;
}

export default ({ type, className, children }: AlertProps) => {
    return (
        <div
            className={
                'UiAlert ' +
                classNames(
                    'flex items-center rounded-md border-l-8 px-4 py-3 text-gray-50 shadow',
                    {
                        ['border-red-500 bg-red-500/25']: type === 'danger',
                        ['border-blue-500 bg-blue-500/25']: type === 'info',
                        ['border-yellow-500 bg-yellow-500/25']: type === 'warning',
                    },
                    className,
                )
            }
        >
            {children}
        </div>
    );
};
