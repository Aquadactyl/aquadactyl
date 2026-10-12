import React, { useMemo } from "react";
import Spinner from "@/components/elements/Spinner";
import clsx from "clsx";
import Fade from "@/components/elements/Fade";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";

export interface RequiredModalProps {
  visible: boolean;
  onDismissed: () => void;
  appear?: boolean;
  top?: boolean;
}

export interface ModalProps extends RequiredModalProps {
  dismissable?: boolean;
  closeOnEscape?: boolean;
  closeOnBackground?: boolean;
  showSpinnerOverlay?: boolean;
  children?: React.ReactNode;
}

export const ModalMask: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={clsx(
      "fixed inset-0 z-50 flex w-full overflow-auto bg-black/70",
      className,
    )}
    {...props}
  />
);

export const handleModalOpenChange = (
  open: boolean,
  eventDetails: { reason?: string } | undefined,
  isDismissable: boolean,
  closeOnEscape: boolean,
  closeOnBackground: boolean,
  onDismissed: () => void,
) => {
  if (!open) {
    if (!isDismissable) return;
    if (eventDetails?.reason === "escape-key" && !closeOnEscape) return;
    if (eventDetails?.reason === "outside-press" && !closeOnBackground) return;
    onDismissed();
  }
};

const Modal: React.FC<ModalProps> = ({
  visible,
  dismissable,
  showSpinnerOverlay,
  top = true,
  closeOnBackground = true,
  closeOnEscape = true,
  onDismissed,
  children,
}) => {
  const isDismissable = useMemo(() => {
    return (dismissable ?? true) && !showSpinnerOverlay;
  }, [dismissable, showSpinnerOverlay]);

  return (
    <Dialog.Root
      open={visible}
      onOpenChange={(open, eventDetails) => {
        handleModalOpenChange(
          open,
          eventDetails,
          isDismissable,
          closeOnEscape,
          closeOnBackground,
          onDismissed,
        );
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop
          className={clsx(
            "fixed inset-0 z-50 flex w-full overflow-y-auto bg-black/70 p-4 transition-opacity duration-150",
            "data-ending-style:opacity-0 data-starting-style:opacity-0",
          )}
        >
          <Dialog.Popup
            className={clsx(
              "relative m-auto mb-auto flex max-h-[calc(100vh-8rem)] w-full max-w-[95%] flex-col md:max-w-[75%] lg:max-w-[50%]",
              top && "mt-[20%] md:mt-[10%]",
              "transition-all duration-150",
              "data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
            )}
          >
            {isDismissable && (
              <Dialog.Close
                className={
                  "close-icon absolute -top-10 right-0 cursor-pointer p-2 text-white opacity-50 transition-all duration-150 ease-linear hover:rotate-90 hover:opacity-100 [&>svg]:h-6 [&>svg]:w-6"
                }
                onClick={() => onDismissed()}
                aria-label="Close dialog"
              >
                <X className="h-6 w-6" />
              </Dialog.Close>
            )}
            {showSpinnerOverlay && (
              <Fade timeout={150} appear in>
                <div
                  className={
                    "absolute flex h-full w-full items-center justify-center rounded"
                  }
                  style={{
                    background: "hsla(211, 10%, 53%, 0.35)",
                    zIndex: 9999,
                  }}
                >
                  <Spinner />
                </div>
              </Fade>
            )}
            <div
              className={
                "overflow-y-scroll rounded bg-neutral-800 p-3 shadow-md transition-all duration-150 sm:p-4 md:p-6"
              }
            >
              {children}
            </div>
          </Dialog.Popup>
        </Dialog.Backdrop>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default Modal;
