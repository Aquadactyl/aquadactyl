import type { LucideIcon } from "lucide-react";
import classNames from "classnames";
import styles from "./style.module.css";
import CopyOnClick from "@/components/elements/CopyOnClick";

interface StatBlockProps {
  title: string;
  copyOnClick?: string;
  color?: string | undefined;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}

export default ({
  title,
  copyOnClick,
  icon: IconComponent,
  color,
  className,
  children,
}: StatBlockProps) => {
  return (
    <CopyOnClick text={copyOnClick}>
      <div className={classNames(styles.stat_block, "bg-gray-600", className)}>
        <div
          className={classNames(styles.status_bar, color || "bg-gray-700")}
        />
        <div className={classNames(styles.icon, color || "bg-gray-700")}>
          <IconComponent
            className={classNames({
              "text-gray-100": !color || color === "bg-gray-700",
              "text-gray-50": color && color !== "bg-gray-700",
            })}
          />
        </div>
        <div className={"flex w-full flex-col justify-center overflow-hidden"}>
          <p
            className={
              "font-header text-xs leading-tight font-medium text-gray-200 md:text-sm"
            }
          >
            {title}
          </p>
          <div
            className={
              "h-7 w-full truncate text-sm leading-7 font-semibold text-gray-50 sm:text-base"
            }
          >
            {children}
          </div>
        </div>
      </div>
    </CopyOnClick>
  );
};
