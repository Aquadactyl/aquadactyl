import React, { forwardRef } from "react";
import classNames from "classnames";
import { ButtonProps, Options } from "@/components/elements/button/types";
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, shape, size, variant, className, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={classNames(
          "btn",
          "btn-primary",
          {
            "btn-secondary": variant === Options.Variant.Secondary,
            "btn-square": shape === Options.Shape.IconSquare,
            "btn-small": size === Options.Size.Small,
            "btn-large": size === Options.Size.Large,
          },
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

const TextButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <Button
      ref={ref}
      className={classNames("btn-text", className)}
      {...props}
    />
  ),
);

const DangerButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <Button
      ref={ref}
      className={classNames("btn-danger", className)}
      {...props}
    />
  ),
);

const _Button: typeof Button & {
  Sizes: typeof Options.Size;
  Shapes: typeof Options.Shape;
  Variants: typeof Options.Variant;
  Text: typeof TextButton;
  Danger: typeof DangerButton;
} = Object.assign(Button, {
  Sizes: Options.Size,
  Shapes: Options.Shape,
  Variants: Options.Variant,
  Text: TextButton,
  Danger: DangerButton,
});

export default _Button;
