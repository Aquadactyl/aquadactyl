import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import I18NextHttpBackend, { HttpBackendOptions } from "i18next-http-backend";
import I18NextMultiloadBackendAdapter from "i18next-multiload-backend-adapter";
import { applyDocumentLanguage, localization } from "@/lib/localization";

// If we're using HMR use a unique hash per page reload so that we're always
// doing cache busting. Otherwise just use the builder provided hash value in
// the URL to allow cache busting to occur whenever the front-end is rebuilt.
const hash = import.meta.hot
  ? Date.now().toString(16)
  : process.env.WEBPACK_BUILD_HASH || Date.now().toString(16);

applyDocumentLanguage(localization.locale);
i18n.on("languageChanged", applyDocumentLanguage);

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
      backendOption: {
        loadPath: "/locales/locale.json?locale={{lng}}&namespace={{ns}}",
        queryStringParams: { hash: `${hash}.${localization.revision ?? ""}` },
        allowMultiLoading: true,
      } as HttpBackendOptions,
    } as Record<string, any>,
    interpolation: {
      // Per i18n-react documentation: this is not needed since React is already
      // handling escapes for us.
      escapeValue: false,
    },
  });

export default i18n;
