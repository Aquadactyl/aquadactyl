import React from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import clsx from "clsx";

type Interaction = "hover" | "click" | "focus";

interface Props {
  rest?: number;
  delay?: number | Partial<{ open: number; close: number }>;
  content: React.ReactNode;
  disabled?: boolean;
  arrow?: boolean;
  interactions?: Interaction[];
  placement?:
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-start"
    | "top-end"
    | "bottom-start"
    | "bottom-end"
    | "left-start"
    | "left-end"
    | "right-start"
    | "right-end";
  className?: string;
  children: React.ReactElement<Record<string, unknown>>;
}

export default ({ children, ...props }: Props) => {
  if (props.disabled) {
    return children;
  }

  const [side = "top", align = "center"] = (props.placement || "top").split(
    "-",
  ) as ["top" | "bottom" | "left" | "right", ("start" | "center" | "end")?];

  const delay =
    typeof props.delay === "number"
      ? props.delay
      : (props.delay?.open ?? props.rest ?? 30);

  const closeDelay =
    typeof props.delay === "object" ? props.delay?.close : undefined;

  return (
    <Tooltip.Provider delay={delay} closeDelay={closeDelay}>
      <Tooltip.Root>
        <Tooltip.Trigger render={children} />
        <Tooltip.Portal>
          <Tooltip.Positioner
            side={side}
            align={align}
            sideOffset={props.arrow ? 10 : 6}
            className={"z-9999"}
          >
            <Tooltip.Popup
              className={clsx(
                "pointer-events-none max-w-[24rem] rounded bg-gray-900 px-3 py-2 text-sm text-gray-200 shadow-md",
                "transition duration-75 ease-out",
                "data-ending-style:scale-90 data-ending-style:opacity-0 data-starting-style:scale-90 data-starting-style:opacity-0",
                props.className,
              )}
            >
              {props.content}
              {props.arrow && (
                <Tooltip.Arrow
                  className={
                    "h-2.5 w-2.5 rotate-45 bg-gray-900 data-[side=bottom]:-top-1 data-[side=left]:-right-1 data-[side=right]:-left-1 data-[side=top]:-bottom-1"
                  }
                />
              )}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};
