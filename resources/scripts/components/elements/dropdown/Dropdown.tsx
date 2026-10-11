import React, { ElementType, forwardRef, useMemo } from "react";
import { Menu } from "@base-ui/react/menu";
import clsx from "clsx";
import DropdownItem from "@/components/elements/dropdown/DropdownItem";
import DropdownButton from "@/components/elements/dropdown/DropdownButton";

interface Props {
  as?: ElementType;
  children: React.ReactNode;
}

const DropdownGap = ({ invisible }: { invisible?: boolean }) => (
  <div
    className={clsx("m-2 border", {
      "border-neutral-700": !invisible,
      "border-transparent": invisible,
    })}
  />
);

type TypedChild = React.ReactNode & {
  type?: unknown;
};

const Dropdown = forwardRef<HTMLElement, Props>(({ children }, ref) => {
  const [Button, items] = useMemo(() => {
    const list = React.Children.toArray(children) as unknown as TypedChild[];

    return [
      list.filter((child) => child.type === DropdownButton),
      list.filter((child) => child.type !== DropdownButton),
    ];
  }, [children]);

  if (!Button || Button.length === 0) {
    throw new Error(
      "Cannot mount <Dropdown /> component without a child <Dropdown.Button />.",
    );
  }

  return (
    <div className={"dropdown-menu"} ref={ref as any}>
      <Menu.Root>
        {Button}
        <Menu.Portal>
          <Menu.Positioner
            side={"bottom"}
            align={"end"}
            sideOffset={4}
            className={"z-10"}
          >
            <Menu.Popup
              className={clsx(
                "dropdown-items_container w-56 rounded bg-neutral-900 shadow-lg",
                "transition duration-75 ease-out",
                "data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
              )}
            >
              <div className={"px-1 py-1"}>{items}</div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
});

const _Dropdown: typeof Dropdown & {
  Button: typeof DropdownButton;
  Item: typeof DropdownItem;
  Gap: typeof DropdownGap;
} = Object.assign(Dropdown, {
  Button: DropdownButton,
  Item: DropdownItem,
  Gap: DropdownGap,
});

export { _Dropdown as default };
