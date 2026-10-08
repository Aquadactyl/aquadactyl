import React from 'react';
import classNames from 'classnames';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
    isLight?: boolean;
    as?: any;
}

const Label: React.FC<LabelProps> = ({ isLight, className, as: Component = 'label', ...props }) => {
    return (
        <Component
            className={classNames(
                'block text-sm font-medium text-neutral-300 mb-2',
                isLight && 'text-neutral-700',
                className
            )}
            {...props}
        />
    );
};

export default Label;
