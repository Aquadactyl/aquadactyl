import React, { forwardRef, useId } from "react";
import Input from "@/components/elements/Input";
import Label from "@/components/elements/Label";
import { FieldError } from "react-hook-form";

interface FormFieldOwnProps {
  id?: string;
  name: string;
  label?: string;
  description?: string;
  light?: boolean;
  error?: FieldError | string;
}

export type FormFieldProps = FormFieldOwnProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "name">;

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ id, name, label, description, light = false, error, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id || generatedId;
    const errorMessage = typeof error === "string" ? error : error?.message;

    return (
      <div>
        {label && (
          <Label htmlFor={fieldId} isLight={light}>
            {label}
          </Label>
        )}
        <Input
          id={fieldId}
          ref={ref}
          name={name}
          isLight={light}
          hasError={!!errorMessage}
          aria-invalid={!!errorMessage}
          aria-describedby={
            description || errorMessage ? `${fieldId}-help` : undefined
          }
          {...props}
        />
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
