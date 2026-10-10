import React, { forwardRef } from "react";
import classNames from "classnames";
import ThemedInput from "@/components/elements/Input";

enum Variant {
  Normal,
  Snug,
  Loose,
}

const Component = forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<"input"> & { variant?: Variant }
>(({ className, variant, ...props }, ref) => (
  <ThemedInput
    ref={ref}
    className={classNames(
      variant === Variant.Loose ? "px-6 py-3" : "px-4 py-2",
      className,
    )}
    {...props}
  />
));

const InputField = Object.assign(Component, { Variants: Variant });

export default InputField;
