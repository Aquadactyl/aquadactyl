import React, { useId } from "react";
import Label from "@/components/elements/Label";
import { FieldError } from "react-hook-form";

interface FormFieldWrapperProps {
  id?: string;
  label?: string;
  description?: string;
  error?: FieldError | string;
  className?: string;
  children: React.ReactNode;
}

const FormFieldWrapper = ({
  id,
  label,
  description,
  error,
  className,
  children,
}: FormFieldWrapperProps) => {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const errorMessage = typeof error === "string" ? error : error?.message;

  return (
    <div className={className}>
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      {children}
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
};

export default FormFieldWrapper;
