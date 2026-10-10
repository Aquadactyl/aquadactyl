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
});

