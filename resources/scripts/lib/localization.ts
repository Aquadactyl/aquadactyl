import type { Resource } from "i18next";

export interface LanguagePack {
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
}

export interface PanelLocalization {
  languages: Record<string, LanguagePack>;
  locale: string;
  fallbackLocale: string;
  revision?: string;
  resources?: Resource;
}

declare global {
  interface Window {
    PanelLocalization?: PanelLocalization;
  }
}

export const localization: PanelLocalization = window.PanelLocalization ?? {
  languages: {
    en: { name: "English", nativeName: "English", direction: "ltr" },
  },
  locale: "en",
  fallbackLocale: "en",
};

export const applyDocumentLanguage = (locale: string) => {
  document.documentElement.lang = locale.replaceAll("_", "-");
  document.documentElement.dir =
    localization.languages[locale]?.direction ?? "ltr";
};
