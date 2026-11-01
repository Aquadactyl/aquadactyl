import { describe, expect, it } from "vitest";
import { localization, applyDocumentLanguage } from "./localization";
import { theme, th } from "./theme";

describe("lib/localization and lib/theme", () => {
  describe("theme", () => {
    it("returns theme value for existing key and empty string for non-existent key", () => {
      expect(theme("colors.black")).toBe("#0c1116");
      expect(th("colors.cyan.400")).toBe("#55c0b7");
      expect(theme("fontFamily.sans")).toContain("IBM Plex Sans");
      expect(theme("colors.nonexistent")).toBe("");
    });

    it("returns computed CSS variable when present in DOM", () => {
      document.documentElement.style.setProperty(
        "--color-primary-400",
        "#123456",
      );
      expect(theme("colors.primary.400")).toBe("#123456");
      document.documentElement.style.removeProperty("--color-primary-400");
    });
  });

  describe("localization", () => {
    it("provides fallback localization and applies document language", () => {
      expect(localization.locale).toBe("en");
      expect(localization.languages.en.name).toBe("English");

      // Apply known LTR language
      applyDocumentLanguage("en");
      expect(document.documentElement.lang).toBe("en");
      expect(document.documentElement.dir).toBe("ltr");

      // Apply language with underscore
      applyDocumentLanguage("en_US");
      expect(document.documentElement.lang).toBe("en-US");
      expect(document.documentElement.dir).toBe("ltr");

      // Apply unknown language falling back to ltr
      applyDocumentLanguage("unknown_LANG");
      expect(document.documentElement.lang).toBe("unknown-LANG");
      expect(document.documentElement.dir).toBe("ltr");

      // Custom language in localization with RTL
      (localization.languages as any).ar = {
        name: "Arabic",
        nativeName: "العربية",
        direction: "rtl",
      };
      applyDocumentLanguage("ar");
      expect(document.documentElement.lang).toBe("ar");
      expect(document.documentElement.dir).toBe("rtl");
    });
  });
});
