import React, { forwardRef, useState } from "react";
import classNames from "classnames";
import ThemedInput from "@/components/elements/Input";
import { Eye, EyeOff } from "lucide-react";
import usePanelTranslation from "@/plugins/usePanelTranslation";

enum Variant {
  Normal,
  Snug,
  Loose,
}

const Component = forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<"input"> & {
    variant?: Variant;
    hidePasswordToggle?: boolean;
  }
>(
  (
    {
      className,
      variant,
      type,
      hidePasswordToggle = false,
      disabled,
      ...props
    },
    ref,
  ) => {
    const { t } = usePanelTranslation();
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password" && !hidePasswordToggle;

    if (isPassword) {
      return (
        <div className={classNames("password-field", className)}>
          <ThemedInput
            ref={ref}
            type={showPassword ? "text" : "password"}
            disabled={disabled}
            className={variant === Variant.Loose ? "px-6 py-3" : "px-4 py-2"}
            {...props}
          />
          <button
            type={"button"}
            className={"password-reveal"}
            aria-label={
              showPassword
                ? t("password.hide_password", "Hide password")
                : t("password.show_password", "Show password")
            }
            aria-pressed={showPassword}
            disabled={disabled}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? (
              <EyeOff size={18} aria-hidden />
            ) : (
              <Eye size={18} aria-hidden />
            )}
          </button>
        </div>
      );
    }

    return (
      <ThemedInput
        ref={ref}
        type={type}
        disabled={disabled}
        className={classNames(
          variant === Variant.Loose ? "px-6 py-3" : "px-4 py-2",
          className,
        )}
        {...props}
      />
    );
  },
);

const InputField = Object.assign(Component, { Variants: Variant });

export default InputField;
