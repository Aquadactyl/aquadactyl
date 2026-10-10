import React, { useEffect, useState } from "react";
import Fade from "@/components/elements/Fade";
import Portal from "@/components/elements/Portal";
import classNames from "classnames";
import usePrivacyMode from "@/plugins/usePrivacyMode";

interface CopyOnClickProps {
  text: string | number | null | undefined;
  showInNotification?: boolean;
  children: React.ReactNode;
}

const copyToClipboard = async (value: string): Promise<boolean> => {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fallback to execCommand if navigator.clipboard fails
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);
    return successful;
  } catch {
    return false;
  }
};

const CopyOnClick = ({
  text,
  showInNotification = true,
  children,
}: CopyOnClickProps) => {
  const [copied, setCopied] = useState(false);
  const privacyMode = usePrivacyMode();

  useEffect(() => {
    if (!copied) return;

    const timeout = setTimeout(() => {
      setCopied(false);
    }, 2500);

    return () => {
      clearTimeout(timeout);
    };
  }, [copied]);

  if (!React.isValidElement(children)) {
    throw new Error(
      "Component passed to <CopyOnClick/> must be a valid React element.",
    );
  }

  const childProps = (children.props || {}) as Record<string, any>;
  const onlyChild = React.Children.only(children) as React.ReactElement<
    Record<string, any>
  >;

  const child = !text
    ? onlyChild
    : React.cloneElement(onlyChild, {
        className: classNames(childProps.className || "", "cursor-pointer"),
        onClick: (e: React.MouseEvent<HTMLElement>) => {
          copyToClipboard(String(text)).then((success) => {
            if (success) {
              setCopied(true);
            }
          });

          if (typeof childProps.onClick === "function") {
            childProps.onClick(e);
          }
        },
      });

  return (
    <>
      {copied && (
        <Portal>
          <Fade in appear timeout={250} key={copied ? "visible" : "invisible"}>
            <div className={"fixed right-0 bottom-0 z-50 m-4"}>
              <div
                className={
                  "rounded-md bg-neutral-600/95 px-4 py-3 text-gray-200 shadow-sm"
                }
              >
                <p>
                  {showInNotification && !privacyMode
                    ? `Copied "${String(text)}" to clipboard.`
                    : "Copied text to clipboard."}
                </p>
              </div>
            </div>
          </Fade>
        </Portal>
      )}
      {child}
    </>
  );
};

export default CopyOnClick;
