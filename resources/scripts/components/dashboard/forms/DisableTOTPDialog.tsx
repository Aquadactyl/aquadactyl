import usePanelTranslation from "@/plugins/usePanelTranslation";
import React, { useContext, useEffect, useState } from "react";
import asDialog from "@/hoc/asDialog";
import { Dialog, DialogWrapperContext } from "@/components/elements/dialog";
import { Button } from "@/components/elements/button/index";
import { Input } from "@/components/elements/inputs";
import Tooltip from "@/components/elements/tooltip/Tooltip";
import disableAccountTwoFactor from "@/api/account/disableAccountTwoFactor";
import { useFlashKey } from "@/plugins/useFlash";
import { useAppStore } from "@/state";
import FlashMessageRender from "@/components/FlashMessageRender";
import Label from "@/components/elements/Label";

const DisableTOTPDialog = () => {
  const { t } = usePanelTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const { clearAndAddHttpError } = useFlashKey("account:two-step");
  const { close, setProps } = useContext(DialogWrapperContext);
  const updateUserData = useAppStore((state) => state.user.updateUserData);

  useEffect(() => {
    setProps((state) => ({ ...state, preventExternalClose: submitting }));
  }, [submitting]);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (submitting) return;

    setSubmitting(true);
    clearAndAddHttpError();
    disableAccountTwoFactor(password)
      .then(() => {
        updateUserData({ useTotp: false });
        close();
      })
      .catch(clearAndAddHttpError)
      .then(() => setSubmitting(false));
  };

  return (
    <form id={"disable-totp-form"} className={"mt-6"} onSubmit={submit}>
      <FlashMessageRender byKey={"account:two-step"} className={"-mt-2 mb-6"} />
      <Label htmlFor={"totp-password"}>
        {t("two_factor_disable.password", "Password")}
      </Label>
      <Input.Text
        id={"totp-password"}
        type={"password"}
        autoComplete={"current-password"}
        variant={Input.Text.Variants.Loose}
        value={password}
        disabled={submitting}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setPassword(e.currentTarget.value)
        }
      />
      <Dialog.Footer>
        <Button.Text type={"button"} onClick={close}>
          {t("two_factor_disable.cancel", "Cancel")}
        </Button.Text>
        <Tooltip
          delay={100}
          disabled={password.length > 0}
          content={t(
            "two_factor_disable.you_must_enter_your_account_password_to_continue",
            "You must enter your account password to continue.",
          )}
        >
          <Button.Danger
            type={"submit"}
            form={"disable-totp-form"}
            disabled={submitting || !password.length}
          >
            {t("two_factor_disable.disable", "Disable")}
          </Button.Danger>
        </Tooltip>
      </Dialog.Footer>
    </form>
  );
};

export default asDialog({
  title: "Disable Two-Step Verification",
  description:
    "Disabling two-step verification will make your account less secure.",
})(DisableTOTPDialog);
