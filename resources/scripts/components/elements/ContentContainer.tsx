import type { HTMLAttributes } from "react";
import classNames from "classnames";

const ContentContainer = ({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={classNames(
        "mx-auto w-full max-w-[1136px] px-5 min-[641px]:px-6 min-[801px]:px-8",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

ContentContainer.displayName = "ContentContainer";

export default ContentContainer;
