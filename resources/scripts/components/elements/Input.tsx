import React from 'react';
import classNames from 'classnames';

export interface Props {
  isLight?: boolean;
  hasError?: boolean;
}

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & Props
>(({ isLight, hasError, className, type, ...props }, ref) => {
  const isCheckboxOrRadio = type === 'checkbox' || type === 'radio';
  const classes = isCheckboxOrRadio
    ? classNames(
        'text-primary-500 focus:border-primary-300 focus:ring-primary-300 inline-block h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-xs border border-neutral-500 bg-neutral-900 bg-origin-border align-middle transition-all duration-75 select-none [print-color-adjust:exact] checked:border-transparent checked:bg-current checked:bg-[url(data:image/svg+xml,%3csvg%20viewBox=%270%200%2016%2016%27%20fill=%27white%27%20xmlns=%27http://www.w3.org/2000/svg%27%3e%3cpath%20d=%27M5.707%207.293a1%201%200%200%200-1.414%201.414l2%202a1%201%200%200%200%201.414%200l4-4a1%201%200%200%200-1.414-1.414L7%208.586%205.707%207.293z%27/%3e%3c/svg%3e)] checked:bg-size-[100%_100%] checked:bg-center checked:bg-no-repeat focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-700 focus:outline-hidden',
        type === 'radio' && 'rounded-full',
        className,
      )
    : classNames(
        'w-full min-w-0 resize-none appearance-none rounded border p-3 text-sm shadow-none outline-hidden transition-all duration-150 required:shadow-none invalid:shadow-none focus:ring-0 disabled:opacity-75 [&+.input-help]:mt-1 [&+.input-help]:text-xs',
        isLight
          ? 'focus:border-primary-400 border-neutral-200 bg-white text-neutral-800 disabled:border-neutral-200 disabled:bg-neutral-100'
          : '[&:not(:disabled):not([readonly]):focus]:border-primary-300 [&:not(:disabled):not([readonly]):focus]:ring-primary-400/20 border-neutral-600 bg-neutral-900 text-neutral-100 hover:border-neutral-500 [&:not(:disabled):not([readonly]):focus]:ring-2',
        hasError
          ? 'border-red-400 text-red-100 hover:border-red-300 [&+.input-help]:text-red-200 [&:not(:disabled):not([readonly]):focus]:border-red-300 [&:not(:disabled):not([readonly]):focus]:ring-red-200'
          : '[&+.input-help]:text-neutral-400',
        className,
      );

  return <input ref={ref} type={type} className={classes} {...props} />;
});
Input.displayName = 'Input';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & Props
>(({ isLight, hasError, className, ...props }, ref) => {
  const classes = classNames(
    'w-full min-w-0 resize-none appearance-none rounded border p-3 text-sm shadow-none outline-hidden transition-all duration-150 required:shadow-none invalid:shadow-none focus:ring-0 disabled:opacity-75 [&+.input-help]:mt-1 [&+.input-help]:text-xs',
    isLight
      ? 'focus:border-primary-400 border-neutral-200 bg-white text-neutral-800 disabled:border-neutral-200 disabled:bg-neutral-100'
      : '[&:not(:disabled):not([readonly]):focus]:border-primary-300 [&:not(:disabled):not([readonly]):focus]:ring-primary-400 [&:not(:disabled):not([readonly]):focus]:ring-opacity-20 border-neutral-600 bg-neutral-900 text-neutral-100 hover:border-neutral-500 [&:not(:disabled):not([readonly]):focus]:ring-2',
    hasError
      ? 'border-red-400 text-red-100 hover:border-red-300 [&+.input-help]:text-red-200 [&:not(:disabled):not([readonly]):focus]:border-red-300 [&:not(:disabled):not([readonly]):focus]:ring-red-200'
      : '[&+.input-help]:text-neutral-400',
    className,
  );

  return <textarea ref={ref} className={classes} {...props} />;
});
Textarea.displayName = 'Textarea';

export { Textarea };
export default Input;
