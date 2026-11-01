import React from "react";
import clsx from "clsx";
import { Separator } from "@base-ui/react/separator";
import { DividerProps } from "./types";

export default function UiDivider({
  className,
  children,
  orientation = "horizontal",
}: DividerProps) {
  if (children) {
    return (
      <Separator
        orientation={orientation}
        className={"UiDivider " + clsx("relative w-full", className)}
        render={(props) => (
          <div {...props}>
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-gray-800 px-2 text-gray-400">{children}</span>
            </div>
          </div>
        )}
      />
    );
  }

  return (
    <Separator
      orientation={orientation}
      className={"UiDivider " + clsx("h-px w-full bg-gray-700", className)}
    />
  );
}
