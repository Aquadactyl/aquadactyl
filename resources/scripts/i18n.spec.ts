import { describe, expect, it, vi, beforeEach } from "vitest";

const mockApplyDocumentLanguage = vi.fn();

vi.mock("@/lib/localization", () => ({
  applyDocumentLanguage: (locale: string) => mockApplyDocumentLanguage(locale),
  localization: {
    locale: "en",
    fallbackLocale: "en",
    languages: { en: "English", de: "German" },
    revision: "v1",
  },
}));

describe("i18n", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("configures i18next and handles language changes", async () => {
    const i18nModule = await import("./i18n");
    const i18n = i18nModule.default;

    expect(mockApplyDocumentLanguage).toHaveBeenCalledWith("en");
    expect(i18n).toBeDefined();

    // Trigger languageChanged listener
    i18n.emit("languageChanged", "de");
    expect(mockApplyDocumentLanguage).toHaveBeenCalledWith("de");
  });

  it("resolves hash properly based on hot and envHash parameters", async () => {
    const { resolveI18nHash } = await import("./i18n");

    const hotHash = resolveI18nHash(true);
    expect(hotHash).toBeDefined();

    const envHash = resolveI18nHash(false, "custom-hash");
    expect(envHash).toBe("custom-hash");

    const fallbackHash = resolveI18nHash(false, "");
    expect(fallbackHash).toBeDefined();
  });

  it("builds backend options with and without revision", async () => {
    const { getI18nBackendOptions } = await import("./i18n");

    const withRevision = getI18nBackendOptions("build123", "rev1");
    expect(withRevision.queryStringParams).toEqual({ hash: "build123.rev1" });

    const withoutRevision = getI18nBackendOptions("build123", undefined);
    expect(withoutRevision.queryStringParams).toEqual({ hash: "build123." });
  });
});
