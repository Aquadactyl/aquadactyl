import usePanelTranslation from "@/plugins/usePanelTranslation";
import React from "react";
import ContentBox from "@/components/elements/ContentBox";
import UpdatePasswordForm from "@/components/dashboard/forms/UpdatePasswordForm";
import UpdateEmailAddressForm from "@/components/dashboard/forms/UpdateEmailAddressForm";
import ProfilePictureForm from "@/components/dashboard/forms/ProfilePictureForm";
import PrivacySettingsForm from "@/components/dashboard/forms/PrivacySettingsForm";
import LanguageSettingsForm from "@/components/dashboard/forms/LanguageSettingsForm";
import ConfigureTwoFactorForm from "@/components/dashboard/forms/ConfigureTwoFactorForm";
import AccountSignInMethods from "@/components/dashboard/forms/AccountSignInMethods";
import PageContentBlock from "@/components/elements/PageContentBlock";
import MessageBox from "@/components/MessageBox";
import { useLocation } from "react-router";
import { useAppStore } from "@/state";

import BeforeContent from "@blueprint/components/Account/Overview/BeforeContent";
import AfterContent from "@blueprint/components/Account/Overview/AfterContent";

export default () => {
  const { t } = usePanelTranslation();
  const location = useLocation();
  const state = location.state as { twoFactorRedirect?: boolean } | null;
  const features = useAppStore((state) => state.settings.data?.features);

  return (
    <PageContentBlock title={t("account.account_settings", "Account settings")}>
      <div className={"page-heading"}>
        <div>
          <p className={"page-eyebrow"}>
            {t("account.your_account", "Your account")}
          </p>
          <h1 className={"page-title"}>
            {t("account.account_settings", "Account settings")}
          </h1>
          <p className={"page-description"}>
            {t(
              "account.manage_your_sign_in_details_and_keep_your_account_secure",
              "Manage your sign-in details and keep your account secure.",
            )}
          </p>
        </div>
      </div>
      {state?.twoFactorRedirect && (
        <MessageBox
          title={t(
            "account.two_step_verification_required",
            "Two-step verification required",
          )}
          type={"error"}
        >
          {t(
            "account.enable_two_step_verification_below_to_continue",
            "Enable two-step verification below to continue.",
          )}
        </MessageBox>
      )}
      <BeforeContent />
      <ContentBox
        style={{ marginBottom: 24 }}
        title={t("account.language", "Language")}
        description={t(
          "account.choose_how_the_panel_is_displayed_for_your_account",
          "Choose how the panel is displayed for your account.",
        )}
        showFlashes={"account:language"}
      >
        <LanguageSettingsForm />
      </ContentBox>
      <ContentBox
        style={{ marginBottom: 24 }}
        title={t("account.profile_picture", "Profile picture")}
        description={t(
          "account.personalize_your_account_with_a_picture",
          "Personalize your account with a picture.",
        )}
        showFlashes={"account:avatar"}
      >
        {features?.customProfilePictures !== false ? (
          <ProfilePictureForm />
        ) : (
          <p className={"text-sm text-neutral-400"}>
            {t(
              "account.custom_profile_pictures_have_been_disabled_by_your_administrator",
              "Custom profile pictures have been disabled by your administrator.",
            )}
          </p>
        )}
      </ContentBox>
      <ContentBox
        style={{ marginBottom: 24 }}
        title={t("account.privacy", "Privacy")}
        description={t(
          "account.control_what_appears_while_sharing_your_screen",
          "Control what appears while sharing your screen.",
        )}
        showFlashes={"account:privacy"}
      >
        {features?.privacyMode !== false ? (
          <PrivacySettingsForm />
        ) : (
          <p className={"text-sm text-neutral-400"}>
            {t(
              "account.sensitive_data_blur_has_been_disabled_by_your_administrator",
              "Sensitive data blur has been disabled by your administrator.",
            )}
          </p>
        )}
      </ContentBox>
      <div className={"account-grid"}>
        <ContentBox
          title={t("account.password", "Password")}
          description={t(
            "account.choose_a_strong_password_that_you_don_t_use_elsewhere",
            "Choose a strong password that you don’t use elsewhere.",
          )}
          showFlashes={"account:password"}
        >
          <UpdatePasswordForm />
        </ContentBox>
        <ContentBox
          title={t("account.email_address", "Email address")}
          description={t(
            "account.keep_your_contact_and_recovery_address_up_to_date",
            "Keep your contact and recovery address up to date.",
          )}
          showFlashes={"account:email"}
        >
          <UpdateEmailAddressForm />
        </ContentBox>
        <ContentBox
          title={t("account.two_step_verification", "Two-step verification")}
          description={t(
            "account.add_an_extra_layer_of_protection_to_your_account",
            "Add an extra layer of protection to your account.",
          )}
        >
          <ConfigureTwoFactorForm />
        </ContentBox>
      </div>
      <AccountSignInMethods />
      <AfterContent />
    </PageContentBlock>
  );
};
