import React, { forwardRef, useId } from "react";
import { Field as FormikField, FieldProps } from "formik";
import Input from "@/components/elements/Input";
import Label from "@/components/elements/Label";

interface OwnProps {
  name: string;
  light?: boolean;
  label?: string;
  description?: string;
  validate?: (value: any) => undefined | string | Promise<any>;
}

type Props = OwnProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "name">;

const Field = forwardRef<HTMLInputElement, Props>(
  (
    { id, name, light = false, label, description, validate, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const fieldId = id || generatedId;
    return (
      <FormikField name={name} validate={validate}>
        {({ field, form: { errors, touched } }: FieldProps) => (
          <div>
            {label && (
              <Label htmlFor={fieldId} isLight={light}>
                {label}
              </Label>
            )}
            <Input
              id={fieldId}
              ref={ref}
              {...field}
              {...props}
              isLight={light}
              hasError={!!(touched[field.name] && errors[field.name])}
              aria-invalid={!!(touched[field.name] && errors[field.name])}
              aria-describedby={
                description || (touched[field.name] && errors[field.name])
                  ? fieldId + "-help"
                  : undefined
              }
            />
            {touched[field.name] && errors[field.name] ? (
              <p id={fieldId + "-help"} className={"input-help error"}>
                {(errors[field.name] as string).charAt(0).toUpperCase() +
                  (errors[field.name] as string).slice(1)}
              </p>
            ) : description ? (
              <p id={fieldId + "-help"} className={"input-help"}>
                {description}
              </p>
            ) : null}
          </div>
        )}
      </FormikField>
    );
  },
);
Field.displayName = "Field";

export default Field;
