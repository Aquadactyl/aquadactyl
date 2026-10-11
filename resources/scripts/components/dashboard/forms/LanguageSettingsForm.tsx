import React, { useState } from "react";
import { useAppStore } from "@/state";
import { useFlashKey } from "@/plugins/useFlash";
import usePanelTranslation from "@/plugins/usePanelTranslation";
import updateAccountLanguage from "@/api/account/updateAccountLanguage";
import Select from "@/components/elements/Select";
import Label from "@/components/elements/Label";
import i18n from "@/i18n";
import { localization } from "@/lib/localization";

export default () => {
  const { t } = usePanelTranslation();
  const preference = useAppStore(
    (state) => state.user.data?.language ?? "auto",
  );
  const updateUserData = useAppStore((state) => state.user.updateUserData);
  const { clearFlashes, clearAndAddHttpError } =
    useFlashKey("account:language");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const changeLanguage = async (language: string) => {
    if (language === preference || saving) return;
    clearFlashes();
    setSaving(true);
    setSaved(false);
    try {
      const result = await updateAccountLanguage(language);
      updateUserData({ language: result.language });
      await i18n.changeLanguage(result.locale);
      setSaved(true);
    } catch (error) {
      clearAndAddHttpError(error instanceof Error ? error : String(error));
    } finally {
      setSaving(false);
    }
  };

  const locale = i18n.language || localization.locale;
  return (
    <div className="max-w-xl">
      <Label htmlFor="account-language">
        {t("language.label", "Panel language")}
      </Label>
      <Select
        id="account-language"
        value={
          Object.hasOwn(localization.languages, preference)
            ? preference
            : "auto"
        }
        disabled={saving}
        aria-describedby="account-language-help account-language-status"
        onChange={(event) => void changeLanguage(event.currentTarget.value)}
      >
        <option value="auto">
          {t("language.automatic", "Automatic (browser language)")}
        </option>
        {Object.entries(localization.languages).map(([code, language]) => (
          <option key={code} value={code}>
            {language.nativeName}
          </option>
        ))}
      </Select>
      <p id="account-language-help" className="mt-3 text-sm text-neutral-400">
        {t(
          "language.help",
          "Choose a language for your account, or let the panel follow your browser language preferences.",
        )}
      </p>
      <p
        id="account-language-status"
        className="mt-2 text-sm text-neutral-400"
        role="status"
        aria-live="polite"
      >
        {saving
          ? t("language.saving", "Saving...")
          : saved
            ? t("language.saved", "Language preference saved to your account.")
            : t("language.current", "Currently using {{language}}.", {
                language: localization.languages[locale]?.nativeName ?? locale,
              })}
      </p>
      {Object.keys(localization.languages).length === 1 && (
        <p className="mt-2 text-xs text-neutral-400">
          {t(
            "language.only_english",
            "English is currently the only installed language. More languages will appear here when your administrator adds language packs.",
          )}
        </p>
      )}
    </div>
  );
};
