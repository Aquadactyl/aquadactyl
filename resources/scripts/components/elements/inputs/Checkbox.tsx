import React, { forwardRef } from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";
import clsx from "clsx";

interface Props {
  id?: string;
  name?: string;
  value?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  className?: string;
  onCheckedChange?: (checked: boolean) => void;
  [key: string]: any;
}

export default forwardRef<HTMLButtonElement, Props>(
  (
    {
      className,
      checked,
      defaultChecked,
      indeterminate,
      disabled,
      name,
      value,
      id,
      onCheckedChange,
      ...props
    },
    ref,
  ) => (
    <BaseCheckbox.Root
      ref={ref}
      id={id}
      name={name}
      value={value}
      checked={checked}
      defaultChecked={defaultChecked}
      indeterminate={indeterminate}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      className={clsx(
        "focus-visible:outline-primary-300 data-checked:bg-primary-500 data-indeterminate:bg-primary-500 inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-xs border border-neutral-500 bg-neutral-900 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 data-checked:border-transparent data-disabled:cursor-not-allowed data-disabled:opacity-50 data-indeterminate:border-transparent",
        className,
      )}
      {...props}
    >
      <BaseCheckbox.Indicator className="flex items-center justify-center text-[var(--color-primary-contrast)]">
        <Check className="h-3.5 w-3.5 stroke-3" />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  ),
);
