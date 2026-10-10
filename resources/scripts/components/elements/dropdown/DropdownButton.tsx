import classNames from "classnames";
import { ChevronDown } from "lucide-react";
import { Menu } from "@headlessui/react";
import React from "react";

interface Props {
  className?: string;
  animate?: boolean;
  children: React.ReactNode;
}

export default ({ className, animate = true, children }: Props) => (
  <Menu.Button className={classNames("dropdown-button", className || "px-4")}>
    {typeof children === "string" ? (
      <>
        <span className={"mr-2"}>{children}</span>
        <ChevronDown aria-hidden={"true"} data-animated={animate.toString()} />
      </>
    ) : (
      children
    )}
  </Menu.Button>
);
