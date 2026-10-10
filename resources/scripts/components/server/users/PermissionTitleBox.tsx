import React, { memo, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import TitledGreyBox from "@/components/elements/TitledGreyBox";
import Input from "@/components/elements/Input";
import isEqual from "react-fast-compare";

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

    const onCheckboxClicked = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.currentTarget.checked) {
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
              <Input
                type={"checkbox"}
                checked={
                  permissions.length > 0 &&
                  permissions.every((p) => value.includes(p))
                }
                onChange={onCheckboxClicked}
              />
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

export default PermissionTitleBox;
