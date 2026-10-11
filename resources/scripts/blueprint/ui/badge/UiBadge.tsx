import React from "react";
import clsx from "clsx";
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, className, ...rest }) => {
  return (
    <span className={clsx("UiBadge", className)} {...rest}>
      {children}
    </span>
  );
};

export default Badge;
