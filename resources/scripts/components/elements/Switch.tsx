import React, { forwardRef, useId } from "react";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import clsx from "clsx";
import Label from "@/components/elements/Label";

export interface SwitchProps {
  id?: string;
  name?: string;
  label?: string;
  description?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
  onCheckedChange?: (checked: boolean, eventDetails: any) => void;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<any>) => void;
  children?: React.ReactNode;
  [key: string]: any;
}

const Switch = forwardRef<any, SwitchProps>(
  (
    {
      id,
      name,
      label,
      description,
      defaultChecked,
      checked,
      readOnly,
      disabled,
      onChange,
      onCheckedChange,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const switchId = id || generatedId;

    const handleCheckedChange = (isChecked: boolean, eventDetails: any) => {
      onCheckedChange?.(isChecked, eventDetails);
      if (onChange) {
        const syntheticEvent = {
          target: {
            name,
            checked: isChecked,
            type: "checkbox",
            value: isChecked ? "on" : "",
          },
          currentTarget: {
            name,
            checked: isChecked,
            type: "checkbox",
            value: isChecked ? "on" : "",
          },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    return (
      <div className="flex items-center">
        {children || (
          <BaseSwitch.Root
            id={switchId}
            name={name}
            inputRef={ref}
            checked={checked}
            defaultChecked={defaultChecked}
            onCheckedChange={handleCheckedChange}
            disabled={disabled}
            readOnly={readOnly}
            className={clsx(
              "focus-visible:outline-primary-300 data-checked:border-primary-700 data-checked:bg-primary-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-[#78838f] bg-[#39424b] p-0.5 transition-colors duration-150 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 data-disabled:cursor-not-allowed data-disabled:opacity-50",
              className,
            )}
            {...props}
          >
            <BaseSwitch.Thumb className="pointer-events-none block h-5 w-5 rounded-full border border-[#bbc2ca] bg-[#d7dce1] transition-transform duration-150 ease-in-out data-checked:translate-x-5 data-checked:border-[var(--color-primary-contrast)] data-checked:bg-[var(--color-primary-contrast)]" />
          </BaseSwitch.Root>
        )}

        {(label || description) && (
          <div className="ml-4 w-full">
            {label && (
              <Label
                className={clsx("cursor-pointer", !!description && "mb-0")}
                htmlFor={switchId}
              >
                {label}
              </Label>
            )}
            {description && (
              <p className="mt-2 text-sm text-neutral-400">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  },
);

Switch.displayName = "Switch";

export default Switch;
