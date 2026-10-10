import { z } from "zod";
import type { FormikErrors } from "formik";

/**
 * Creates a Formik-compatible validate function from a Zod schema.
 */
export function toFormikValidate<T>(
  schema: z.ZodType<any>,
): (values: T) => FormikErrors<T> {
  return (values: T) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return {};
    }

    const errors: Record<string, any> = {};

    for (const issue of result.error.issues) {
      if (issue.path.length === 0) {
        continue;
      }

      let current = errors;
      for (let i = 0; i < issue.path.length; i++) {
        const key = String(issue.path[i]);
        if (i === issue.path.length - 1) {
          if (!current[key]) {
            current[key] = issue.message;
          }
        } else {
          if (!current[key] || typeof current[key] !== "object") {
            current[key] = typeof issue.path[i + 1] === "number" ? [] : {};
          }
          current = current[key];
        }
      }
    }

    return errors as FormikErrors<T>;
  };
}
