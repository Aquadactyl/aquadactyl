import React, { cloneElement, useRef, useState } from "react";
import {
  arrow,
  autoUpdate,
  flip,
  offset,
  Placement,
  shift,
  Side,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
  FloatingPortal,
} from "@floating-ui/react";
import { AnimatePresence, motion } from "motion/react";
import classNames from "classnames";

type Interaction = "hover" | "click" | "focus";

interface Props {
  rest?: number;
  delay?: number | Partial<{ open: number; close: number }>;
  content: React.ReactNode;
  disabled?: boolean;
  arrow?: boolean;
  interactions?: Interaction[];
  placement?: Placement;
  className?: string;
  children: React.ReactElement<Record<string, unknown>>;
}

const arrowSides: Record<Side, string> = {
  top: "bottom-[-6px] left-0",
  bottom: "top-[-6px] left-0",
  right: "top-0 left-[-6px]",
  left: "top-0 right-[-6px]",
};

export default ({ children, ...props }: Props) => {
  const arrowEl = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const { x, y, refs, middlewareData, strategy, context } = useFloating({
    open,
    strategy: "fixed",
    placement: props.placement || "top",
    middleware: [
      offset(props.arrow ? 10 : 6),
      flip(),
      shift({ padding: 6 }),
      arrow({ element: arrowEl, padding: 6 }),
    ],
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
  });

  const interactions = props.interactions || ["hover", "focus"];
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, {
      restMs: props.rest ?? 30,
      delay: props.delay ?? 0,
      enabled: interactions.includes("hover"),
    }),
    useFocus(context, { enabled: interactions.includes("focus") }),
    useClick(context, { enabled: interactions.includes("click") }),
    useRole(context, { role: "tooltip" }),
    useDismiss(context),
  ]);

  const side = arrowSides[(props.placement || "top").split("-")[0] as Side];
  const { x: ax, y: ay } = middlewareData.arrow || {};

  if (props.disabled) {
    return children;
  }

  return (
    <>
      {cloneElement(
        children,
        getReferenceProps({
          ref: refs.setReference,
          ...(children.props as object),
        }),
      )}
      <FloatingPortal>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                type: "spring",
                damping: 20,
                stiffness: 300,
                duration: 0.075,
              }}
              {...getFloatingProps({
                ref: refs.setFloating,
                className:
                  "bg-gray-900 text-sm text-gray-200 px-3 py-2 rounded pointer-events-none max-w-[24rem] z-[9999]",
                style: {
                  position: strategy,
                  top: `${y || 0}px`,
                  left: `${x || 0}px`,
                  zIndex: 9999,
                },
              })}
            >
              {props.content}
              {props.arrow && (
                <div
                  ref={arrowEl}
                  style={{
                    transform: `translate(${Math.round(ax || 0)}px, ${Math.round(
                      ay || 0,
                    )}px) rotate(45deg)`,
                  }}
                  className={classNames("absolute h-3 w-3 bg-gray-900", side)}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  );
};
