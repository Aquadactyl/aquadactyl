import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import I18NextHttpBackend, { HttpBackendOptions } from "i18next-http-backend";
import I18NextMultiloadBackendAdapter from "i18next-multiload-backend-adapter";
import { applyDocumentLanguage, localization } from "@/lib/localization";

export const resolveI18nHash = (hot?: boolean, envHash?: string): string => {
  if (hot) {
    return Date.now().toString(16);
  }
  return envHash || Date.now().toString(16);
};

const hash = resolveI18nHash(
  Boolean(import.meta.hot),
  process.env.WEBPACK_BUILD_HASH,
);

applyDocumentLanguage(localization.locale);
i18n.on("languageChanged", applyDocumentLanguage);

export const getI18nBackendOptions = (
  buildHash: string,
  revision?: string,
): HttpBackendOptions & { allowMultiLoading?: boolean } => ({
  loadPath: "/locales/locale.json?locale={{lng}}&namespace={{ns}}",
  queryStringParams: { hash: `${buildHash}.${revision ?? ""}` },
  allowMultiLoading: true,
});

i18n
  .use(I18NextMultiloadBackendAdapter)
  .use(initReactI18next)
  .init({
    debug: process.env.DEBUG === "true",
    lng: localization.locale,
    supportedLngs: Object.keys(localization.languages),
    fallbackLng: [...new Set([localization.fallbackLocale, "en"])],
    load: "currentOnly",
    ns: ["panel"],
    // Preserve Blueprint addons that use the original default namespace.
    defaultNS: "translation",
    keySeparator: ".",
    backend: {
      backend: I18NextHttpBackend,
      backendOption: getI18nBackendOptions(hash, localization.revision),
    } as Record<string, any>,
    interpolation: {
      // Per i18n-react documentation: this is not needed since React is already
      // handling escapes for us.
      escapeValue: false,
    },
  });

export default i18n;
