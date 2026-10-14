import React, { forwardRef, useId, useState } from "react";
import Input from "@/components/elements/Input";
import Label from "@/components/elements/Label";
import { FieldError } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import usePanelTranslation from "@/plugins/usePanelTranslation";

interface FormFieldOwnProps {
  id?: string;
  name: string;
  label?: string;
  description?: string;
  light?: boolean;
  error?: FieldError | string;
  hidePasswordToggle?: boolean;
}

export type FormFieldProps = FormFieldOwnProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "name">;

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      id,
      name,
      label,
      description,
      light = false,
      error,
      type,
      hidePasswordToggle = false,
      ...props
    },
    ref,
  ) => {
    const { t } = usePanelTranslation();
    const generatedId = useId();
    const fieldId = id || generatedId;
    const errorMessage = typeof error === "string" ? error : error?.message;
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password" && !hidePasswordToggle;

    return (
      <div className="panel-form-field">
        {label && (
          <Label htmlFor={fieldId} isLight={light}>
            {label}
          </Label>
        )}
        {isPassword ? (
          <div className={"password-field"}>
            <Input
              id={fieldId}
              ref={ref}
              name={name}
              type={showPassword ? "text" : "password"}
              isLight={light}
              hasError={!!errorMessage}
              aria-invalid={!!errorMessage}
              aria-describedby={
                description || errorMessage ? `${fieldId}-help` : undefined
              }
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
              disabled={props.disabled}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? (
                <EyeOff size={18} aria-hidden />
              ) : (
                <Eye size={18} aria-hidden />
              )}
            </button>
          </div>
        ) : (
          <Input
            id={fieldId}
            ref={ref}
            name={name}
            type={type}
            isLight={light}
            hasError={!!errorMessage}
            aria-invalid={!!errorMessage}
            aria-describedby={
              description || errorMessage ? `${fieldId}-help` : undefined
            }
            {...props}
          />
        )}
        {errorMessage ? (
          <p id={`${fieldId}-help`} className={"input-help error"}>
            {errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1)}
          </p>
        ) : description ? (
          <p id={`${fieldId}-help`} className={"input-help"}>
            {description}
          </p>
        ) : null}
      </div>
    );
  },
);

FormField.displayName = "FormField";

export default FormField;
