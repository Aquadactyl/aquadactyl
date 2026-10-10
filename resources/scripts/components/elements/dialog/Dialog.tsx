import React, { useRef, useState } from "react";
import { Dialog as HDialog } from "@headlessui/react";
import { Button } from "@/components/elements/button/index";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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
    down: boolean,
    e: React.MouseEvent<HTMLDivElement>,
  ): void => {
    if (
      e.target instanceof HTMLElement &&
      container.current?.isSameNode(e.target)
    ) {
      setDown(down);
    }
  };

  const onDialogClose = (): void => {
    if (!preventExternalClose) {
      return onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <DialogContext.Provider value={{ setIcon, setFooter, setIconPosition }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <HDialog static open={open} onClose={onDialogClose}>
              <div className={"fixed inset-0 z-40 bg-gray-900/50"} />
              <div className={"fixed inset-0 z-50 overflow-y-auto"}>
                <div
                  ref={container}
                  className={"dialog_container"}
                  onMouseDown={onContainerClick.bind(this, true)}
                  onMouseUp={onContainerClick.bind(this, false)}
                >
                  <HDialog.Panel
                    as={motion.div}
                    initial={"closed"}
                    animate={down ? "bounce" : "open"}
                    exit={"closed"}
                    variants={variants}
                    className={"dialog_panel"}
                  >
                    <div className={"flex overflow-y-auto p-6 pb-0"}>
                      {iconPosition === "container" && icon}
                      <div className={"max-h-[70vh] min-w-0 flex-1"}>
                        <div className={"flex items-center"}>
                          {iconPosition !== "container" && icon}
                          <div>
                            {title && (
                              <HDialog.Title className={"dialog_title"}>
                                {title}
                              </HDialog.Title>
                            )}
                            {description && (
                              <HDialog.Description>
                                {description}
                              </HDialog.Description>
                            )}
                          </div>
                        </div>
                        {children}
                        <div className={"invisible h-6"} />
                      </div>
                    </div>
                    {footer}
                    {/* Keep this below the other buttons so that it isn't the default focus if they're present. */}
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
                  </HDialog.Panel>
                </div>
              </div>
            </HDialog>
          </motion.div>
        </DialogContext.Provider>
      )}
    </AnimatePresence>
  );
};
