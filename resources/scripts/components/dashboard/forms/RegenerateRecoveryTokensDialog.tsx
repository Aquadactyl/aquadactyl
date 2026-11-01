import usePanelTranslation from "@/plugins/usePanelTranslation";
import React, { useContext, useEffect, useState } from "react";
import asDialog from "@/hoc/asDialog";
import { Dialog, DialogWrapperContext } from "@/components/elements/dialog";
import { Button } from "@/components/elements/button/index";
import { Input } from "@/components/elements/inputs";
import Tooltip from "@/components/elements/tooltip/Tooltip";
import regenerateAccountRecoveryTokens from "@/api/account/regenerateAccountRecoveryTokens";
import { useFlashKey } from "@/plugins/useFlash";
import FlashMessageRender from "@/components/FlashMessageRender";
import Label from "@/components/elements/Label";

interface Props {
  onTokens: (tokens: string[]) => void;
}

const RegenerateRecoveryTokensDialog = ({ onTokens }: Props) => {
  const { t } = usePanelTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const { clearAndAddHttpError } = useFlashKey("account:two-step");
  const { close, setProps } = useContext(DialogWrapperContext);

  useEffect(() => {
    setProps((state) => ({ ...state, preventExternalClose: submitting }));
  }, [submitting]);

  useEffect(() => {
    setProps((state) => ({
      ...state,
      title: t("recovery.regenerate_backup_codes", "Regenerate Backup Codes"),
      description: t(
        "recovery.regenerate_description",
        "Enter your account password to generate a new set of backup codes.",
      ),
    }));
  }, []);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (submitting) return;

    setSubmitting(true);
    clearAndAddHttpError();
    regenerateAccountRecoveryTokens(password)
      .then((tokens) => {
        close();
        onTokens(tokens);
      })
      .catch(clearAndAddHttpError)
      .then(() => setSubmitting(false));
  };

  return (
    <form id={"regenerate-tokens-form"} className={"mt-6"} onSubmit={submit}>
      <FlashMessageRender byKey={"account:two-step"} className={"-mt-2 mb-6"} />
      <p className={"mb-4 text-sm text-neutral-300"}>
        {t(
          "recovery.regenerate_warning",
          "Regenerating backup codes will invalidate any previously generated backup codes.",
        )}
      </p>
      <Label htmlFor={"regenerate-password"}>
        {t("recovery.password", "Password")}
      </Label>
      <Input.Text
        id={"regenerate-password"}
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
          {t("recovery.cancel", "Cancel")}
        </Button.Text>
        <Tooltip
          delay={100}
          disabled={password.length > 0}
          content={t(
            "recovery.you_must_enter_your_account_password_to_continue",
            "You must enter your account password to continue.",
          )}
        >
          <Button
            type={"submit"}
            form={"regenerate-tokens-form"}
            disabled={submitting || !password.length}
          >
            {t("recovery.regenerate", "Regenerate Codes")}
          </Button>
        </Tooltip>
      </Dialog.Footer>
    </form>
  );
};

export default asDialog({
  title: "Regenerate Backup Codes",
  description:
    "Enter your account password to generate a new set of backup codes.",
})(RegenerateRecoveryTokensDialog);
