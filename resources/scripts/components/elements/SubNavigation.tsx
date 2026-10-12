import type { HTMLAttributes } from "react";
import clsx from "clsx";

const SubNavigation = ({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={clsx(
        "panel-subnavigation w-full overflow-x-auto border-b border-[#272e35] bg-[#11161b]",
        "[&>div]:mx-auto [&>div]:flex [&>div]:max-w-[1200px] [&>div]:items-center [&>div]:px-4 [&>div]:text-sm",
        "[&>div>a]:inline-block [&>div>a]:px-3 [&>div>a]:py-4 [&>div>a]:whitespace-nowrap [&>div>a]:text-[#9ca5af] [&>div>a]:no-underline [&>div>a]:transition-all [&>div>a]:duration-150",
        "[&>div>div]:inline-block [&>div>div]:px-3 [&>div>div]:py-4 [&>div>div]:whitespace-nowrap [&>div>div]:text-[#9ca5af] [&>div>div]:no-underline [&>div>div]:transition-all [&>div>div]:duration-150",
        "[&>div>a:not(:first-of-type)]:ml-2 [&>div>div:not(:first-of-type)]:ml-2",
        "[&>div>a:hover]:text-[#e9ecef] [&>div>div:hover]:text-[#e9ecef]",
        "[&>div>a.active]:text-primary-200 [&>div>a:active]:text-primary-200 [&>div>a.active]:shadow-[inset_0_-2px_var(--panel-accent)] [&>div>a:active]:shadow-[inset_0_-2px_var(--panel-accent)]",
        "[&>div>div.active]:text-primary-200 [&>div>div:active]:text-primary-200 [&>div>div.active]:shadow-[inset_0_-2px_var(--panel-accent)] [&>div>div:active]:shadow-[inset_0_-2px_var(--panel-accent)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

SubNavigation.displayName = "SubNavigation";

export default SubNavigation;
