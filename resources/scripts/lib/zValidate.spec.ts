import { describe, expect, it } from "vitest";
import { z } from "zod";
import { toFormikValidate } from "@/lib/zValidate";

describe("toFormikValidate", () => {
  it("returns empty object on valid data", () => {
    const schema = z.object({
      username: z.string().min(1, "Username required"),
      email: z.string().email("Invalid email"),
    });

    const validate = toFormikValidate(schema);
    const errors = validate({
      username: "alex",
      email: "alex@example.com",
    });

    expect(errors).toEqual({});
  });

  it("returns formatted errors on invalid data", () => {
    const schema = z.object({
      username: z.string().min(1, "Username required"),
      email: z.string().email("Invalid email"),
    });

    const validate = toFormikValidate(schema);
    const errors = validate({
      username: "",
      email: "invalid-email",
    });

    expect(errors).toEqual({
      username: "Username required",
      email: "Invalid email",
    });
  });

  it("handles nested properties correctly", () => {
    const schema = z.object({
      user: z.object({
        name: z.string().min(1, "Name required"),
      }),
    });

    const validate = toFormikValidate(schema);
    const errors = validate({
      user: { name: "" },
    });

    expect(errors).toEqual({
      user: {
        name: "Name required",
      },
    });
  });

  it("handles array items in nested paths", () => {
    const schema = z.object({
      tags: z.array(z.string().min(3, "Too short")),
    });

    const validate = toFormikValidate(schema);
    const errors = validate({ tags: ["valid", "no"] });
    expect(errors).toEqual({
      tags: [undefined, "Too short"],
    });
  });

  it("ignores root level errors with empty path and keeps first error on duplicate issue", () => {
    const schema = z
      .object({
        field: z
          .string()
          .min(5, "Min 5 required")
          .regex(/^\d+$/, "Must be digits"),
      })
      .refine(() => false, "Root level failure");

    const validate = toFormikValidate(schema);
    const errors = validate({ field: "abc" });
    expect(errors).toEqual({
      field: "Min 5 required",
    });
  });

  it("handles multiple errors sharing deeply nested parent object", () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          first: z.string().min(1, "First required"),
          last: z.string().min(1, "Last required"),
        }),
      }),
    });
    const validate = toFormikValidate(schema);
    const errors = validate({ user: { profile: { first: "", last: "" } } });
    expect(errors).toEqual({
      user: {
        profile: {
          first: "First required",
          last: "Last required",
        },
      },
    });
  });
});
