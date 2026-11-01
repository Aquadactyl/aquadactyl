import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { store } from "@/state";
import i18n from "@/i18n";
import LanguageSettingsForm from "./LanguageSettingsForm";

const mocks = vi.hoisted(() => {
  window.PanelLocalization = {
    locale: "en",
    fallbackLocale: "en",
    languages: {
      en: { name: "English", nativeName: "English", direction: "ltr" },
      fr: { name: "French", nativeName: "Français", direction: "ltr" },
      ar: { name: "Arabic", nativeName: "العربية", direction: "rtl" },
    },
  };
  return { update: vi.fn(), error: vi.fn() };
});

vi.mock("@/api/account/updateAccountLanguage", () => ({
  default: mocks.update,
}));
vi.mock("@/plugins/useFlash", () => ({
  useFlashKey: () => ({
    clearFlashes: vi.fn(),
    clearAndAddHttpError: mocks.error,
  }),
}));
vi.mock("@/i18n", async () => {
  const { createInstance } = await import("i18next");
  const { initReactI18next } = await import("react-i18next");
  const { applyDocumentLanguage } = await import("@/lib/localization");
  const instance = createInstance();
  await instance.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    ns: ["panel"],
    defaultNS: "translation",
    resources: {
      en: { panel: {} },
      fr: { panel: { language: { label: "Langue du panneau" } } },
      ar: { panel: { language: { label: "لغة اللوحة" } } },
    },
  });
  instance.on("languageChanged", applyDocumentLanguage);
  return { default: instance };
});

describe("account language preferences", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    mocks.update.mockReset();
    mocks.error.mockReset();
    store.getActions().user.setUserData({
      uuid: "language-test",
      username: "test",
      email: "test@example.com",
      language: "en",
      rootAdmin: false,
      useTotp: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<LanguageSettingsForm />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
  });

  const choose = async (language: string) => {
    await act(async () => {
      const select = container.querySelector<HTMLSelectElement>("select")!;
      select.value = language;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };

  it("persists a choice and updates text, document language and direction", async () => {
    mocks.update.mockResolvedValue({ language: "ar", locale: "ar" });
    await choose("ar");
    expect(mocks.update).toHaveBeenCalledWith("ar");
    expect(store.getState().user.data?.language).toBe("ar");
    expect(container.textContent).toContain("لغة اللوحة");
    expect(container.textContent).toContain(
      "Language preference saved to your account.",
    );
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("uses the server's browser-language resolution for automatic selection", async () => {
    mocks.update.mockResolvedValue({ language: "auto", locale: "fr" });
    await choose("auto");
    expect(mocks.update).toHaveBeenCalledWith("auto");
    expect(store.getState().user.data?.language).toBe("auto");
    expect(container.textContent).toContain("Langue du panneau");
    expect(container.textContent).toContain(
      "Choose a language for your account",
    );
    expect(document.documentElement.lang).toBe("fr");
  });

  it("keeps the saved preference and language when an update fails", async () => {
    const error = new Error("Saving failed");
    mocks.update.mockRejectedValue(error);
    await choose("fr");
    expect(store.getState().user.data?.language).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(mocks.error).toHaveBeenCalledWith(error);
    expect(container.querySelector<HTMLSelectElement>("select")!.disabled).toBe(
      false,
    );
  });

  it("returns early without updating if selecting the currently active preference", async () => {
    await choose("en");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("handles non-Error thrown during language update", async () => {
    mocks.update.mockRejectedValue("String error message");
    await choose("fr");
    expect(mocks.error).toHaveBeenCalledWith("String error message");
  });

  it("handles empty language preference and unknown locale in status message", async () => {
    store.getActions().user.setUserData({
      uuid: "test-user-2",
      username: "user2",
      email: "u2@test.com",
      language: undefined as any,
      rootAdmin: false,
      useTotp: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const origLang = i18n.language;
    (i18n as any).language = "";

    const testContainer = document.createElement("div");
    document.body.appendChild(testContainer);
    const testRoot = createRoot(testContainer);

    act(() => testRoot.render(<LanguageSettingsForm />));
    expect(testContainer.textContent).toContain("English");

    act(() => testRoot.unmount());
    testContainer.remove();
    (i18n as any).language = origLang;
  });

  it("falls back to raw locale name when locale is not in localization.languages", () => {
    const origLang = i18n.language;
    (i18n as any).language = "es";

    const testContainer = document.createElement("div");
    document.body.appendChild(testContainer);
    const testRoot = createRoot(testContainer);

    act(() => testRoot.render(<LanguageSettingsForm />));
    expect(testContainer.textContent).toContain("Currently using es");

    act(() => testRoot.unmount());
    testContainer.remove();
    (i18n as any).language = origLang;
  });

  it("displays only-english notice when only 1 language is available", () => {
    const origLanguages = window.PanelLocalization!.languages;
    window.PanelLocalization!.languages = {
      en: { name: "English", nativeName: "English", direction: "ltr" },
    };

    const singleContainer = document.createElement("div");
    document.body.appendChild(singleContainer);
    const singleRoot = createRoot(singleContainer);

    act(() => singleRoot.render(<LanguageSettingsForm />));
    expect(singleContainer.textContent).toContain(
      "English is currently the only installed language",
    );

    act(() => singleRoot.unmount());
    singleContainer.remove();
    window.PanelLocalization!.languages = origLanguages;
  });
});
