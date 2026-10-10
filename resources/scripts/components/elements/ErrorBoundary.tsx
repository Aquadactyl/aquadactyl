import React from "react";
import { TriangleAlert } from "lucide-react";

interface FallbackProps {
  error?: Error;
  resetErrorBoundary: () => void;
}

interface Props {
  fallback?: React.ReactNode | ((props: FallbackProps) => React.ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    error: undefined,
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(error);
    this.props.onError?.(error, errorInfo);
  }

  resetErrorBoundary = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (typeof this.props.fallback === "function") {
      return this.props.fallback({
        error: this.state.error,
        resetErrorBoundary: this.resetErrorBoundary,
      });
    }

    if (this.props.fallback !== undefined) {
      return this.props.fallback;
    }

    return (
      <div className={"my-4 flex w-full items-center justify-center"}>
        <div
          className={
            "flex flex-col items-center rounded bg-neutral-900 p-4 text-center text-red-500 sm:flex-row sm:text-left"
          }
        >
          <TriangleAlert className={"mb-2 h-5 w-5 shrink-0 sm:mr-3 sm:mb-0"} />
          <div className={"flex-1"}>
            <p className={"text-sm text-neutral-100"}>
              An error was encountered by the application while rendering this
              view. Try refreshing the page.
            </p>
          </div>
          <button
            type={"button"}
            className={
              "mt-2 cursor-pointer rounded border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs text-neutral-200 transition-colors hover:bg-neutral-700 sm:mt-0 sm:ml-4"
            }
            onClick={this.resetErrorBoundary}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
