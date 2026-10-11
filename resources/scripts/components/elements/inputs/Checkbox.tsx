import React, { forwardRef } from "react";
import clsx from "clsx";
type Props = Omit<React.ComponentProps<"input">, "type">;

export default forwardRef<HTMLInputElement, Props>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type={"checkbox"}
      className={clsx("form-input checkbox_input", className)}
      {...props}
    />
  ),
);
