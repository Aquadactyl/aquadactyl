import React from 'react';
import classNames from 'classnames';

export interface Props {
    isLight?: boolean;
    hasError?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & Props>(
    ({ isLight, hasError, className, type, ...props }, ref) => {
        const isCheckboxOrRadio = type === 'checkbox' || type === 'radio';
        const classes = isCheckboxOrRadio
            ? classNames(
                  "inline-block h-4 w-4 flex-shrink-0 cursor-pointer select-none appearance-none rounded-sm border border-neutral-500 bg-neutral-900 align-middle text-primary-500 transition-all duration-75 [background-origin:border-box] [print-color-adjust:exact] checked:border-transparent checked:bg-current checked:bg-center checked:bg-no-repeat checked:[background-image:url(\"data:image/svg+xml,%3csvg_viewBox='0_0_16_16'_fill='white'_xmlns='http://www.w3.org/2000/svg'%3e%3cpath_d='M5.707_7.293a1_1_0_0_0-1.414_1.414l2_2a1_1_0_0_0_1.414_0l4-4a1_1_0_0_0-1.414-1.414L7_8.586_5.707_7.293z'/%3e%3c/svg%3e\")] checked:[background-size:100%_100%] focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 focus:ring-offset-neutral-700",
                  type === 'radio' && 'rounded-full',
                  className,
              )
            : classNames(
                  'w-full min-w-0 resize-none appearance-none rounded border p-3 text-sm shadow-none outline-none transition-all duration-150 required:shadow-none invalid:shadow-none focus:ring-0 disabled:opacity-75 [&+.input-help]:mt-1 [&+.input-help]:text-xs',
                  isLight
                      ? 'border-neutral-200 bg-white text-neutral-800 focus:border-primary-400 disabled:border-neutral-200 disabled:bg-neutral-100'
                      : 'not-disabled:not-readonly:focus:border-primary-300 not-disabled:not-readonly:focus:ring-2 not-disabled:not-readonly:focus:ring-primary-400 not-disabled:not-readonly:focus:ring-opacity-20 border-neutral-600 bg-neutral-900 text-neutral-100 hover:border-neutral-500',
                  hasError
                      ? 'not-disabled:not-readonly:focus:border-red-300 not-disabled:not-readonly:focus:ring-red-200 border-red-400 text-red-100 hover:border-red-300 [&+.input-help]:text-red-200'
                      : '[&+.input-help]:text-neutral-400',
                  className,
              );

        return <input ref={ref} type={type} className={classes} {...props} />;
    },
);
Input.displayName = 'Input';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & Props>(
    ({ isLight, hasError, className, ...props }, ref) => {
        const classes = classNames(
            'w-full min-w-0 resize-none appearance-none rounded border p-3 text-sm shadow-none outline-none transition-all duration-150 required:shadow-none invalid:shadow-none focus:ring-0 disabled:opacity-75 [&+.input-help]:mt-1 [&+.input-help]:text-xs',
            isLight
                ? 'border-neutral-200 bg-white text-neutral-800 focus:border-primary-400 disabled:border-neutral-200 disabled:bg-neutral-100'
                : 'not-disabled:not-readonly:focus:border-primary-300 not-disabled:not-readonly:focus:ring-2 not-disabled:not-readonly:focus:ring-primary-400 not-disabled:not-readonly:focus:ring-opacity-20 border-neutral-600 bg-neutral-900 text-neutral-100 hover:border-neutral-500',
            hasError
                ? 'not-disabled:not-readonly:focus:border-red-300 not-disabled:not-readonly:focus:ring-red-200 border-red-400 text-red-100 hover:border-red-300 [&+.input-help]:text-red-200'
                : '[&+.input-help]:text-neutral-400',
            className,
        );

        return <textarea ref={ref} className={classes} {...props} />;
    },
);
Textarea.displayName = 'Textarea';

export { Textarea };
export default Input;
