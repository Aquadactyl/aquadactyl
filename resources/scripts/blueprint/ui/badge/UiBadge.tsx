import React from "react";
import classNames from "classnames";
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, className, ...rest }) => {
  return (
    <span className={classNames("UiBadge", className)} {...rest}>
      {children}
    </span>
  );
};

export default Badge;
