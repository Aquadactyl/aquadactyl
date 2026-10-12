import { describe, expect, it } from "vitest";
import Field, { FormField } from "./Field";
import OriginalFormField from "./FormField";

describe("Field", () => {
  it("re-exports FormField as default and named export", () => {
    expect(Field).toBe(OriginalFormField);
    expect(FormField).toBe(OriginalFormField);
  });
});
