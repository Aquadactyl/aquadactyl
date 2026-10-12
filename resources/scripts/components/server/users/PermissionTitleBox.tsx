import React, { memo, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import TitledGreyBox from "@/components/elements/TitledGreyBox";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";
import { dequal as isEqual } from "dequal";

interface Props {
  isEditable: boolean;
  title: string;
  permissions: string[];
  className?: string;
  children?: React.ReactNode;
}

const PermissionTitleBox: React.FC<Props> = memo(
  ({ isEditable, title, permissions, className, children }) => {
    const { watch, setValue } = useFormContext<{ permissions: string[] }>();
    const value = watch("permissions") || [];

    const isAllChecked =
      permissions.length > 0 && permissions.every((p) => value.includes(p));
    const isSomeChecked = permissions.some((p) => value.includes(p));
    const isIndeterminate = isSomeChecked && !isAllChecked;

    const onCheckedChange = useCallback(
      (checked: boolean) => {
        if (checked) {
          setValue(
            "permissions",
            [...value, ...permissions.filter((p) => !value.includes(p))],
            { shouldValidate: true, shouldDirty: true, shouldTouch: true },
          );
        } else {
          setValue(
            "permissions",
            value.filter((p) => !permissions.includes(p)),
            { shouldValidate: true, shouldDirty: true, shouldTouch: true },
          );
        }
      },
      [permissions, value, setValue],
    );

    return (
      <TitledGreyBox
        title={
          <div className={"flex items-center"}>
            <p className={"flex-1 text-sm uppercase"}>{title}</p>
            {isEditable && (
              <BaseCheckbox.Root
                checked={isAllChecked}
                indeterminate={isIndeterminate}
                onCheckedChange={onCheckedChange}
                className="inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-xs border border-neutral-500 bg-neutral-900 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#78d4cc] data-checked:border-transparent data-checked:bg-cyan-500 data-indeterminate:border-transparent data-indeterminate:bg-cyan-500"
              >
                <BaseCheckbox.Indicator className="flex items-center justify-center text-white">
                  {isIndeterminate ? (
                    <Minus className="h-3.5 w-3.5 stroke-3" />
                  ) : (
                    <Check className="h-3.5 w-3.5 stroke-3" />
                  )}
                </BaseCheckbox.Indicator>
              </BaseCheckbox.Root>
            )}
          </div>
        }
        className={className}
      >
        {children}
      </TitledGreyBox>
    );
  },
  isEqual,
);

PermissionTitleBox.displayName = "PermissionTitleBox";

export default PermissionTitleBox;
