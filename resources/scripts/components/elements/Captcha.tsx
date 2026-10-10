import React, { forwardRef, useImperativeHandle, useRef } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Turnstile, TurnstileInstance } from "@marsidev/react-turnstile";
import Reaptcha, { ReaptchaRef } from "@/components/elements/Reaptcha";

export type CaptchaProvider = "recaptcha" | "hcaptcha" | "turnstile";

export interface CaptchaRef {
  execute: () => Promise<void>;
  reset: () => Promise<void>;
}

export interface CaptchaProps {
  provider?: CaptchaProvider;
  sitekey: string;
  onVerify: (response: string) => void;
  onExpire?: () => void;
}

export const Captcha = forwardRef<CaptchaRef, CaptchaProps>(
  ({ provider = "recaptcha", sitekey, onVerify, onExpire }, ref) => {
    const recaptchaRef = useRef<ReaptchaRef>(null);
    const hcaptchaRef = useRef<HCaptcha>(null);
    const turnstileRef = useRef<TurnstileInstance>(null);

    useImperativeHandle(
      ref,
      () => ({
        execute: async () => {
          if (provider === "hcaptcha") {
            if (hcaptchaRef.current) {
              await hcaptchaRef.current.execute({ async: true });
            }
          } else if (provider === "turnstile") {
            if (turnstileRef.current) {
              turnstileRef.current.execute();
            }
          } else {
            if (recaptchaRef.current) {
              await recaptchaRef.current.execute();
            }
          }
        },
        reset: async () => {
          if (provider === "hcaptcha") {
            hcaptchaRef.current?.resetCaptcha();
          } else if (provider === "turnstile") {
            turnstileRef.current?.reset();
          } else {
            await recaptchaRef.current?.reset();
          }
        },
      }),
      [provider],
    );

    if (provider === "hcaptcha") {
      return (
        <HCaptcha
          ref={hcaptchaRef}
          sitekey={sitekey}
          size={"invisible"}
          onVerify={onVerify}
          onExpire={onExpire}
        />
      );
    }

    if (provider === "turnstile") {
      return (
        <Turnstile
          ref={turnstileRef}
          siteKey={sitekey}
          options={{
            execution: "execute",
            appearance: "interaction-only",
          }}
          onSuccess={onVerify}
          onExpire={onExpire}
        />
      );
    }

    return (
      <Reaptcha
        ref={recaptchaRef}
        size={"invisible"}
        sitekey={sitekey}
        onVerify={onVerify}
        onExpire={onExpire}
      />
    );
  },
);

Captcha.displayName = "Captcha";

export default Captcha;
