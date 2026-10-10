import React, { Suspense } from "react";
import classNames from "classnames";
import ErrorBoundary from "@/components/elements/ErrorBoundary";

export type SpinnerSize = "small" | "base" | "large";

interface Props {
  size?: SpinnerSize;
  centered?: boolean;
  isBlue?: boolean;
  className?: string;
}

interface Spinner extends React.FC<Props> {
  Size: Record<"SMALL" | "BASE" | "LARGE", SpinnerSize>;
  Suspense: React.FC<Props>;
}

const sizeClasses: Record<SpinnerSize, string> = {
  small: "w-4 h-4 border-2",
  base: "w-8 h-8 border-[3px]",
  large: "w-16 h-16 border-[6px]",
};

const SpinnerElement = ({
  size = "base",
  isBlue,
  className,
}: {
  size?: SpinnerSize;
  isBlue?: boolean;
  className?: string;
}) => (
  <div
    role="status"
    className={classNames(
      "animate-spin rounded-full border-solid",
      sizeClasses[size],
      isBlue
        ? "border-primary-500/20 border-t-primary-500"
        : "border-white/20 border-t-white",
      className,
    )}
  />
);

const Spinner: Spinner = ({ centered, className, size = "base", isBlue }) =>
  centered ? (
    <div
      className={classNames(
        "flex items-center justify-center",
        size === "large" ? "m-20" : "m-6",
        className,
      )}
    >
      <SpinnerElement size={size} isBlue={isBlue} />
    </div>
  ) : (
    <SpinnerElement className={className} size={size} isBlue={isBlue} />
  );

Spinner.displayName = "Spinner";

Spinner.Size = {
  SMALL: "small",
  BASE: "base",
  LARGE: "large",
};

Spinner.Suspense = ({
  children,
  centered = true,
  size = Spinner.Size.LARGE,
  ...props
}: React.PropsWithChildren<Props>) => (
  <Suspense fallback={<Spinner centered={centered} size={size} {...props} />}>
    <ErrorBoundary>{children}</ErrorBoundary>
  </Suspense>
);
Spinner.Suspense.displayName = "Spinner.Suspense";

export default Spinner;
