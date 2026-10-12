import React, { useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/elements/button/index";
import { X } from "lucide-react";
import { motion } from "motion/react";
import clsx from "clsx";
import { DialogContext, IconPosition, RenderDialogProps } from "./";

const variants = {
  open: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      damping: 15,
      stiffness: 300,
      duration: 0.15,
    },
  },
  closed: {
    scale: 0.75,
    opacity: 0,
    transition: {
      type: "tween" as const,
      ease: "easeIn" as const,
      duration: 0.15,
    },
  },
  bounce: {
    scale: 0.95,
    opacity: 1,
    transition: {
      type: "tween" as const,
      ease: "linear" as const,
      duration: 0.075,
    },
  },
};

export const handleDialogOpenChange = (
  nextOpen: boolean,
  eventDetails: { reason?: string },
  preventExternalClose: boolean | undefined,
  onClose: () => void,
) => {
  if (!nextOpen) {
    if (
      preventExternalClose &&
      (eventDetails.reason === "outside-press" ||
        eventDetails.reason === "escape-key")
    ) {
      return;
    }
    onClose();
  }
};

export default ({
  open,
  title,
  description,
  onClose,
  hideCloseIcon,
  preventExternalClose,
  children,
}: RenderDialogProps) => {
  const container = useRef<HTMLDivElement>(null);
  const [icon, setIcon] = useState<React.ReactNode>();
  const [footer, setFooter] = useState<React.ReactNode>();
  const [iconPosition, setIconPosition] = useState<IconPosition>("title");
  const [down, setDown] = useState(false);

  const onContainerClick = (
    isDown: boolean,
    e: React.MouseEvent<HTMLDivElement>,
  ): void => {
    if (
      e.target instanceof HTMLElement &&
      container.current?.isSameNode(e.target)
    ) {
      setDown(isDown);
    }
  };

  return (
    <Dialog.Root
      open={open}
      disablePointerDismissal={preventExternalClose}
      onOpenChange={(nextOpen, eventDetails) => {
        handleDialogOpenChange(
          nextOpen,
          eventDetails,
          preventExternalClose,
          onClose,
        );
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop
          className={clsx(
            "fixed inset-0 z-40 bg-gray-900/50 transition-opacity duration-150",
            "data-ending-style:opacity-0 data-starting-style:opacity-0",
          )}
        />
        <div className={"fixed inset-0 z-50 overflow-y-auto"}>
          <div
            ref={container}
            className={"dialog_container"}
            onMouseDown={(e) => onContainerClick(true, e)}
            onMouseUp={(e) => onContainerClick(false, e)}
          >
            <Dialog.Popup
              className={"focus:outline-none"}
              render={
                <motion.div
                  initial={"closed"}
                  animate={down ? "bounce" : "open"}
                  exit={"closed"}
                  variants={variants}
                  className={"dialog_panel"}
                />
              }
            >
              <DialogContext.Provider
                value={{ setIcon, setFooter, setIconPosition }}
              >
                <div className={"flex overflow-y-auto p-6 pb-0"}>
                  {iconPosition === "container" && icon}
                  <div className={"max-h-[70vh] min-w-0 flex-1"}>
                    <div className={"flex items-center"}>
                      {iconPosition !== "container" && icon}
                      <div>
                        {title && (
                          <Dialog.Title className={"dialog_title"}>
                            {title}
                          </Dialog.Title>
                        )}
                        {description && (
                          <Dialog.Description>{description}</Dialog.Description>
                        )}
                      </div>
                    </div>
                    {children}
                    <div className={"invisible h-6"} />
                  </div>
                </div>
                {footer}
                {!hideCloseIcon && (
                  <div className={"absolute top-0 right-0 m-4"}>
                    <Button.Text
                      size={Button.Sizes.Small}
                      shape={Button.Shapes.IconSquare}
                      onClick={onClose}
                      className={"group"}
                    >
                      <X className={"dialog_close_icon"} />
                    </Button.Text>
                  </div>
                )}
              </DialogContext.Provider>
            </Dialog.Popup>
          </div>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
