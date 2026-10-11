import React from "react";
import clsx from "clsx";

interface CodeProps {
  dark?: boolean | undefined;
  className?: string;
  children: React.ReactNode;
}

export default ({ dark, className, children }: CodeProps) => (
  <code
    className={clsx(
      "inline-block rounded px-2 py-1 font-mono text-sm",
      className,
      {
        "bg-neutral-700": !dark,
        "bg-neutral-900 text-gray-100": dark,
      },
    )}
  >
    {children}
  </code>
);
