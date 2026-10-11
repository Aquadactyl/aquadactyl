import { useTranslation } from "react-i18next";

// Core strings have an inline English default so a failed or slow language
// request never hides the panel or displays internal translation keys.
export default () => useTranslation("panel", { useSuspense: false });
