import React from "react";
import { useField } from "formik";
import FormField, { FormFieldProps } from "@/components/elements/FormField";

// Older Blueprint forms use Formik's field registration rather than React Hook Form.
export default function Field(props: FormFieldProps) {
  const [field, meta] = useField({ name: props.name, type: props.type });
  return (
    <FormField
      {...props}
      {...field}
      error={meta.touched ? meta.error : undefined}
    />
  );
}
