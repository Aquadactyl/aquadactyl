import usePanelTranslation from "@/plugins/usePanelTranslation";
import React, { useState } from "react";
import { useAppStore } from "@/state";
import { useFlashKey } from "@/plugins/useFlash";
import updateAccountPrivacy from "@/api/account/updateAccountPrivacy";

export default () => {
  const { t } = usePanelTranslation();
  const enabled = useAppStore((state) =>
    Boolean(state.user.data?.blurSensitiveData),
  );
  const updateUserData = useAppStore((state) => state.user.updateUserData);
  const { clearFlashes, clearAndAddHttpError } = useFlashKey("account:privacy");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const toggle = async () => {
    const previous = enabled;
    setSaving(true);
    setSaved(false);
    clearFlashes();
    updateUserData({ blurSensitiveData: !previous });
    try {
      updateUserData({
        blurSensitiveData: await updateAccountPrivacy(!previous),
      });
      setSaved(true);
    } catch (error) {
      updateUserData({ blurSensitiveData: previous });
      clearAndAddHttpError(error instanceof Error ? error : String(error));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className={"privacy-settings"}>
      <div>
        <h3 id={"privacy-blur-label"}>
          {t(
            "privacy.blur_sensitive_information",
            "Blur sensitive information",
          )}
        </h3>
        <p id={"privacy-blur-description"}>
          {t(
            "privacy.blur_email_addresses_ip_addresses_passwords_and_access_keys_hover",
            "Blur email addresses, IP addresses, passwords and access keys. Hover, focus or tap a value to reveal it.",
          )}
        </p>
        <p className={"privacy-save-status"} role={"status"}>
          {saving
            ? t("privacy.saving", "Saving...")
            : saved
              ? t("privacy.saved_to_your_account", "Saved to your account.")
              : t(
                  "privacy.applies_across_the_panel_and_admin_area",
                  "Applies across the panel and admin area.",
                )}
        </p>
      </div>
      <button
        type={"button"}
        role={"switch"}
        aria-checked={enabled}
        aria-labelledby={"privacy-blur-label"}
        aria-describedby={"privacy-blur-description"}
        disabled={saving}
        onClick={toggle}
        className={"privacy-switch"}
      >
        <span />
      </button>
    </div>
  );
};
