import React from "react";
import classNames from "classnames";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  isLight?: boolean;
  as?: any;
}

const Label: React.FC<LabelProps> = ({
  isLight,
  className,
  as: Component = "label",
  ...props
}) => {
  return (
    <Component
      className={classNames(
        "mb-2 block text-sm font-medium text-neutral-300",
        isLight && "text-neutral-700",
        className,
      )}
      {...props}
    />
  );
};

export default Label;
