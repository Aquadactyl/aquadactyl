import React from 'react';
import classNames from 'classnames';

export interface GreyRowBoxProps extends React.HTMLAttributes<HTMLElement> {
    $hoverable?: boolean;
    as?: any;
    to?: any;
    href?: string;
}

const GreyRowBox = React.forwardRef<HTMLDivElement, GreyRowBoxProps>(
    ({ $hoverable = true, className, as: Component = 'div', ...props }, ref) => {
        return (
            <Component
                ref={ref}
                className={classNames(
                    'flex items-center overflow-hidden rounded-lg border border-neutral-600 bg-neutral-700 p-4 text-neutral-200 no-underline transition-colors duration-150 [&_.icon]:flex [&_.icon]:w-16 [&_.icon]:items-center [&_.icon]:justify-center [&_.icon]:rounded-lg [&_.icon]:bg-neutral-900 [&_.icon]:p-3',
                    $hoverable !== false && 'hover:border-neutral-500 hover:bg-neutral-600/50',
                    className,
                )}
                {...props}
            />
        );
    },
);
GreyRowBox.displayName = 'GreyRowBox';

export default GreyRowBox;
