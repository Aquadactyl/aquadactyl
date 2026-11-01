import React, { forwardRef, useImperativeHandle, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import clsx from "clsx";

interface Props {
  children: React.ReactNode;
  renderToggle: (
    onClick: (e: React.MouseEvent<any, MouseEvent>) => void,
  ) => React.ReactElement;
}

export interface DropdownMenuRef {
  triggerMenu: (posX?: number) => void;
}

export type DropdownMenu = DropdownMenuRef;

export const DropdownButtonRow: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }
> = ({ danger, className, ...props }) => (
  <button
    className={clsx(
      "flex w-full cursor-pointer items-center rounded p-2 text-neutral-200 transition-all duration-150 ease-linear",
      danger
        ? "hover:bg-red-900 hover:text-red-200"
        : "hover:bg-neutral-600 hover:text-neutral-50",
      className,
    )}
    {...props}
  />
);

const DropdownMenu = forwardRef<any, Props>(
  ({ children, renderToggle }, ref) => {
    const [open, setOpen] = useState(false);

    useImperativeHandle(ref, () => ({
      triggerMenu: () => {
        setOpen(true);
      },
    }));

    const onClickHandler = (e: React.MouseEvent<any, MouseEvent>) => {
      e.stopPropagation();
    };

    return (
      <Menu.Root open={open} onOpenChange={setOpen}>
        <Menu.Trigger render={renderToggle(onClickHandler)} />
        <Menu.Portal>
          <Menu.Positioner
            side="bottom"
            align="end"
            sideOffset={4}
            className="z-50"
          >
            <Menu.Popup
              className={clsx(
                "w-48 rounded-lg border border-neutral-600 bg-neutral-700 p-2 text-neutral-200 shadow-lg",
                "transition duration-75 ease-out",
                "data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
              )}
            >
              <div onClick={() => setOpen(false)}>{children}</div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    );
  },
);

DropdownMenu.displayName = "DropdownMenu";

export default DropdownMenu;
