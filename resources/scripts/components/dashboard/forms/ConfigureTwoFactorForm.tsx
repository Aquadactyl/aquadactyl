import usePanelTranslation from "@/plugins/usePanelTranslation";
import React, { useEffect, useState } from "react";
import { useAppStore } from "@/state";
import { Button } from "@/components/elements/button/index";
import SetupTOTPDialog from "@/components/dashboard/forms/SetupTOTPDialog";
import RecoveryTokensDialog from "@/components/dashboard/forms/RecoveryTokensDialog";
import DisableTOTPDialog from "@/components/dashboard/forms/DisableTOTPDialog";
import { useFlashKey } from "@/plugins/useFlash";

export default () => {
  const { t } = usePanelTranslation();
  const [tokens, setTokens] = useState<string[]>([]);
  const [visible, setVisible] = useState<"enable" | "disable" | null>(null);
  const isEnabled = useAppStore((state) => state.user.data!.useTotp);
  const { clearAndAddHttpError } = useFlashKey("account:two-step");

  useEffect(() => {
    return () => {
      clearAndAddHttpError();
    };
  }, [visible]);

  const onTokens = (tokens: string[]) => {
    setTokens(tokens);
    setVisible(null);
  };

  return (
    <div>
      <SetupTOTPDialog
        open={visible === "enable"}
        onClose={() => setVisible(null)}
        onTokens={onTokens}
      />
      <RecoveryTokensDialog
        tokens={tokens}
        open={tokens.length > 0}
        onClose={() => setTokens([])}
      />
      <DisableTOTPDialog
        open={visible === "disable"}
        onClose={() => setVisible(null)}
      />
      <p className={"text-sm"}>
        {isEnabled
          ? t(
              "two_factor.two_step_verification_is_currently_enabled_on_your_account",
              "Two-step verification is currently enabled on your account.",
            )
          : t(
              "two_factor.you_do_not_currently_have_two_step_verification_enabled_on",
              "You do not currently have two-step verification enabled on your account. Click the button below to begin configuring it.",
            )}
      </p>
      <div className={"mt-6"}>
        {isEnabled ? (
          <Button.Danger onClick={() => setVisible("disable")}>
            {t("two_factor.disable_two_step", "Disable Two-Step")}
          </Button.Danger>
        ) : (
          <Button onClick={() => setVisible("enable")}>
            {t("two_factor.enable_two_step", "Enable Two-Step")}
          </Button>
        )}
      </div>
    </div>
  );
};
