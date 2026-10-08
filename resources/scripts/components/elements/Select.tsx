import React from 'react';
import classNames from 'classnames';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    hideDropdownArrow?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ hideDropdownArrow, className, ...props }, ref) => {
    return (
        <select
            ref={ref}
            className={classNames(
                'block w-full rounded border bg-no-repeat p-3 pr-8 text-sm shadow-none outline-none transition-colors duration-150 ease-linear [-moz-appearance:none] [-webkit-appearance:none] [background-position:calc(100%-0.75rem)_center] [background-size:1rem] hover:outline-none focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-opacity-50 [&::-ms-expand]:hidden',
                !hideDropdownArrow &&
                    "hover:not-disabled:border-neutral-400 border-neutral-500 bg-neutral-900 text-neutral-100 [background-image:url(\"data:image/svg+xml;charset=UTF-8,%3csvg_xmlns='http://www.w3.org/2000/svg'_viewBox='0_0_20_20'%3e%3cpath_fill='%23C3D1DF'_d='M9.293_12.95l.707.707L15.657_8l-1.414-1.414L10_10.828_5.757_6.586_4.343_8z'/%3e%3c/svg%3e\")] focus:border-neutral-400",
                className,
            )}
            {...props}
        />
    );
});
Select.displayName = 'Select';

export default Select;
