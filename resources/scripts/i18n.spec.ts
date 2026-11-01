import { describe, expect, it, vi, beforeEach } from "vitest";

const mockApplyDocumentLanguage = vi.fn();
const mockLocalization = {
  locale: "en",
  fallbackLocale: "en",
  languages: { en: "English", de: "German" },
  revision: "v1",
  resources: undefined as import("i18next").Resource | undefined,
};

vi.mock("@/lib/localization", () => ({
  applyDocumentLanguage: (locale: string) => mockApplyDocumentLanguage(locale),
  localization: mockLocalization,
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

  it("uses initial labels synchronously and still fetches addon namespaces on demand", async () => {
    vi.resetModules();
    mockLocalization.locale = "de";
    mockLocalization.resources = {
      de: { panel: { greeting: "Hallo" } },
      en: { panel: { greeting: "Hello" } },
    };
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          de: { "test-addon": { greeting: "Nachgeladen" } },
          en: { "test-addon": { greeting: "Loaded later" } },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetch);
    try {
      const { default: i18n } = await import("./i18n");
      expect(i18n.isInitialized).toBe(true);
      expect(i18n.t("greeting", { ns: "panel" })).toBe("Hallo");
      expect(fetch).not.toHaveBeenCalled();
      await i18n.loadNamespaces("test-addon");
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(i18n.t("greeting", { ns: "test-addon" })).toBe("Nachgeladen");
    } finally {
      mockLocalization.locale = "en";
      mockLocalization.resources = undefined;
      vi.unstubAllGlobals();
    }
  });
});
