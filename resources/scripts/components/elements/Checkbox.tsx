import React from "react";
import { useFormContext } from "react-hook-form";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";
import clsx from "clsx";

interface Props {
  name: string;
  value: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  [key: string]: any;
}

const Checkbox = ({
  name,
  value,
  id,
  className,
  disabled,
  ...props
}: Props) => {
  const formContext = useFormContext();
  const currentValues: string[] = formContext
    ? formContext.watch(name) || []
    : [];
  const isChecked =
    Array.isArray(currentValues) && currentValues.includes(value);

  const onCheckedChange = (checked: boolean) => {
    if (!formContext) return;
    const list = Array.isArray(currentValues) ? currentValues : [];
    const set = new Set(list);
    if (checked) {
      set.add(value);
    } else {
      set.delete(value);
    }
    formContext.setValue(name, Array.from(set), {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  return (
    <BaseCheckbox.Root
      id={id}
      name={name}
      value={value}
      checked={isChecked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      className={clsx(
        "focus-visible:outline-primary-300 data-checked:bg-primary-500 inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-xs border border-neutral-500 bg-neutral-900 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 data-checked:border-transparent data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <BaseCheckbox.Indicator className="flex items-center justify-center text-[var(--color-primary-contrast)]">
        <Check className="h-3.5 w-3.5 stroke-3" />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
};

export default Checkbox;
