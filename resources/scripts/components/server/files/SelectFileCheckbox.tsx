import React from "react";
import clsx from "clsx";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";
import { ServerContext } from "@/state/server";

export interface FileActionCheckboxProps {
  id?: string;
  name?: string;
  value?: string;
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  className?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCheckedChange?: (checked: boolean) => void;
  [key: string]: any;
}

export const FileActionCheckbox: React.FC<FileActionCheckboxProps> = ({
  className,
  checked = false,
  indeterminate = false,
  onChange,
  onCheckedChange,
  name,
  value,
  id,
  disabled,
  type: _type,
  ...props
}) => {
  const handleCheckedChange = (nextChecked: boolean) => {
    onCheckedChange?.(nextChecked);
    if (onChange) {
      const syntheticEvent = {
        currentTarget: { checked: nextChecked, name, value },
        target: { checked: nextChecked, name, value },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  };

  return (
    <BaseCheckbox.Root
      id={id}
      name={name}
      value={value}
      checked={checked}
      indeterminate={indeterminate}
      disabled={disabled}
      onCheckedChange={handleCheckedChange}
      className={clsx(
        "focus-visible:outline-primary-300 data-checked:bg-primary-500 data-indeterminate:bg-primary-500 inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-xs border border-neutral-500 bg-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 data-checked:border-transparent data-disabled:cursor-not-allowed data-disabled:opacity-50 data-indeterminate:border-transparent",
        "data-unchecked:hover:border-neutral-300",
        className,
      )}
      {...props}
    >
      <BaseCheckbox.Indicator className="flex items-center justify-center text-[var(--color-primary-contrast)]">
        {indeterminate ? (
          <Minus className="h-3 w-3 stroke-3" />
        ) : (
          <Check className="h-3 w-3 stroke-3" />
        )}
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
};

export default ({ name }: { name: string }) => {
  const isChecked = ServerContext.useStoreState(
    (state) => state.files.selectedFiles.indexOf(name) >= 0,
  );
  const appendSelectedFile = ServerContext.useStoreActions(
    (actions) => actions.files.appendSelectedFile,
  );
  const removeSelectedFile = ServerContext.useStoreActions(
    (actions) => actions.files.removeSelectedFile,
  );

  return (
    <label
      className={"absolute z-30 flex-none cursor-pointer self-center px-4 py-2"}
    >
      <FileActionCheckbox
        name={"selectedFiles"}
        value={name}
        checked={isChecked}
        onCheckedChange={(checked) => {
          if (checked) {
            appendSelectedFile(name);
          } else {
            removeSelectedFile(name);
          }
        }}
      />
    </label>
  );
};
