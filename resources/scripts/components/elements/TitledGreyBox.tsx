import React, { memo } from "react";
import clsx from "clsx";
import { dequal as isEqual } from "dequal";

interface Props {
  icon?: React.ComponentType<{ className?: string }>;
  title: string | React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

const TitledGreyBox = ({
  icon: IconComponent,
  title,
  children,
  className,
}: Props) => (
  <div
    className={clsx(
      "panel-form-section rounded-lg border border-neutral-600 bg-neutral-700 shadow-xs",
      className,
    )}
  >
    <div
      className={
        "panel-form-section__header rounded-t-lg border-b border-neutral-600 bg-neutral-700 p-3"
      }
    >
      {typeof title === "string" ? (
        <p className={"flex items-center text-sm uppercase"}>
          {IconComponent && (
            <IconComponent className={"mr-2 h-4 w-4 text-neutral-300"} />
          )}
          {title}
        </p>
      ) : (
        title
      )}
    </div>
    <div className={"panel-form-section__body p-3"}>{children}</div>
  </div>
);

export default memo(TitledGreyBox, isEqual);
