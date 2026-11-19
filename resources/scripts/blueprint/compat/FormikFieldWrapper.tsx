import React from "react";
import { FieldValidator, useField } from "formik";
import clsx from "clsx";
import Label from "@/components/elements/Label";

export interface FormikFieldWrapperProps {
  id?: string;
  name: string;
  children: React.ReactNode;
  className?: string;
  label?: string;
  description?: string;
  validate?: FieldValidator;
}

// Legacy wrappers register validation without replacing an addon's custom control.
export default function FormikFieldWrapper({
  id,
  name,
  children,
  className,
  label,
  description,
  validate,
}: FormikFieldWrapperProps) {
  const [, meta] = useField({ name, validate });
  const error = meta.touched ? meta.error : undefined;

  return (
    <div className={clsx("panel-form-field", className, error && "has-error")}>
      {label && <Label htmlFor={id}>{label}</Label>}
      {children}
      {error ? (
        <p className="input-help error" role="alert">
          {error}
        </p>
      ) : (
        description && <p className="input-help">{description}</p>
      )}
    </div>
  );
}
