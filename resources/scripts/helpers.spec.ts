import { describe, expect, it } from "vitest";
import {
  cleanDirectoryPath,
  encodePathSegments,
  fileBitsToString,
  hashToPath,
  randomInt,
} from "./helpers";

describe("helpers", () => {
  it("randomInt returns numbers within range", () => {
    for (let i = 0; i < 20; i++) {
      const val = randomInt(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThan(10);
    }
  });

  it("cleanDirectoryPath removes redundant slashes", () => {
    expect(cleanDirectoryPath("//foo///bar//")).toBe("/foo/bar/");
    expect(cleanDirectoryPath("")).toBe("/");
  });

  it("fileBitsToString converts directory and file modes to ls format", () => {
    // Standard directory (0755)
    expect(fileBitsToString("0755", true)).toBe("drwxr-xr-x");

    // Standard file (0644)
    expect(fileBitsToString("0644", false)).toBe("-rw-r--r--");

    // File with high bit set (30th bit = "a")
    const specialMode = (1 << 30).toString(8);
    const res = fileBitsToString(specialMode, false);
    expect(res.startsWith("a")).toBe(true);
  });

  it("encodePathSegments encodes each segment while preserving slashes", () => {
    expect(encodePathSegments("hello world/foo#bar/test?123")).toBe(
      "hello%20world/foo%23bar/test%3F123",
    );
  });

  it("hashToPath decodes hash string or defaults to root", () => {
    expect(hashToPath("#%2Ffolder%2Fsubfolder")).toBe("/folder/subfolder");
    expect(hashToPath("")).toBe("/");
  });
});
