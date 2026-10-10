import React, { useId } from "react";
import classNames from "classnames";
import Label from "@/components/elements/Label";
import Input from "@/components/elements/Input";

export interface SwitchProps {
  id?: string;
  name: string;
  label?: string;
  description?: string;
  defaultChecked?: boolean;
  readOnly?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  children?: React.ReactNode;
}

const Switch = ({
  id,
  name,
  label,
  description,
  defaultChecked,
  readOnly,
  onChange,
  children,
}: SwitchProps) => {
  const generatedId = useId();
  const switchId = id || generatedId;

  return (
    <div className="flex items-center">
      <div
        className={classNames(
          "relative w-12 flex-none leading-normal select-none",
          // Checkbox SR-only Styling
          "[&>input[type='checkbox']]:sr-only",
          // Focus-visible Ring auf dem Label
          "[&>input[type='checkbox']:focus-visible+label]:outline-2 [&>input[type='checkbox']:focus-visible+label]:outline-offset-2 [&>input[type='checkbox']:focus-visible+label]:outline-[#78d4cc]",
          // Checked Background & Border auf dem Label
          "[&>input[type='checkbox']:checked+label]:border-[#1d5558] [&>input[type='checkbox']:checked+label]:bg-[#237c7f] [&>input[type='checkbox']:checked+label]:shadow-none",
          // Checked Position des Schalter-Knopfs (before)
          "[&>input[type='checkbox']:checked+label]:before:right-0.5",
          // Basis-Styling des Labels
          "[&>label]:mb-0 [&>label]:block [&>label]:h-6 [&>label]:cursor-pointer [&>label]:overflow-hidden [&>label]:rounded-full [&>label]:border [&>label]:border-[#78838f] [&>label]:bg-[#39424b] [&>label]:shadow-inner [&>label]:transition-all [&>label]:duration-75 [&>label]:ease-linear",
          // Der Schalter-Knopf (Knob) via Pseudo-Element
          "[&>label]:before:absolute [&>label]:before:top-0.5 [&>label]:before:right-[calc(50%+0.125rem)] [&>label]:before:block [&>label]:before:h-5 [&>label]:before:w-5 [&>label]:before:rounded-full [&>label]:before:border [&>label]:before:border-[#bbc2ca] [&>label]:before:bg-[#d7dce1] [&>label]:before:transition-all [&>label]:before:duration-75 [&>label]:before:ease-in [&>label]:before:content-['']",
        )}
      >
        {children || (
          <Input
            id={switchId}
            name={name}
            type="checkbox"
            onChange={(e) => onChange && onChange(e)}
            defaultChecked={defaultChecked}
            disabled={readOnly}
          />
        )}
        <Label htmlFor={switchId} />
      </div>

      {(label || description) && (
        <div className="ml-4 w-full">
          {label && (
            <Label
              className={classNames("cursor-pointer", !!description && "mb-0")}
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
};

export default Switch;
