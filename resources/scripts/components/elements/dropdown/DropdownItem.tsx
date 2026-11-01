import React, { forwardRef } from "react";
import { Menu } from "@base-ui/react/menu";
import clsx from "clsx";

interface Props {
  children:
    | React.ReactNode
    | ((opts: { active: boolean; disabled: boolean }) => React.ReactElement);
  danger?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactElement;
  onClick?: (e: React.MouseEvent) => void;
}

const DropdownItem = forwardRef<HTMLAnchorElement, Props>(
  (
    { disabled, danger, className, onClick, children, icon: IconComponent },
    ref,
  ) => {
    return (
      <Menu.Item
        disabled={disabled}
        onClick={onClick}
        render={(props, state) => (
          <a
            {...props}
            ref={ref}
            href={"#"}
            className={clsx(
              "dropdown-menu_item",
              {
                danger: danger,
                disabled: state.disabled,
              },
              className,
            )}
          >
            {IconComponent}
            {typeof children === "function"
              ? children({
                  disabled: state.disabled,
                  active: state.highlighted,
                })
              : children}
          </a>
        )}
      />
    );
  },
);

export default DropdownItem;
