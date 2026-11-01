import React, { useContext } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  renderHook,
  fireEvent,
  act,
} from "@testing-library/react";
import asModal from "./asModal";
import asDialog from "./asDialog";
import ModalContext from "@/context/ModalContext";
import { DialogWrapperContext } from "@/components/elements/dialog";

vi.mock("@/components/elements/Modal", () => ({
  default: ({ visible, onDismissed, children, showSpinner, top }: any) => (
    <div
      data-testid="modal"
      data-visible={visible}
      data-spinner={showSpinner}
      data-top={top}
    >
      <button data-testid="modal-dismiss" onClick={onDismissed}>
        Dismiss
      </button>
      {visible ? children : null}
    </div>
  ),
}));

vi.mock("@/components/elements/dialog", () => {
  const React = require("react");
  const DialogWrapperContext = React.createContext({
    props: {},
    setProps: () => {},
    close: () => {},
  });
  const Dialog = ({ open, onClose, children, title }: any) =>
    open ? (
      <div data-testid="dialog" data-title={title}>
        <button data-testid="dialog-close" onClick={onClose}>
          Close
        </button>
        {children}
      </div>
    ) : null;
  return { Dialog, DialogWrapperContext };
});

describe("hoc/asModal and hoc/asDialog and ModalContext", () => {
  describe("ModalContext default values", () => {
    it("executes default fallback functions", () => {
      const { result } = renderHook(() => useContext(ModalContext));
      expect(result.current.dismiss()).toBe(null);
      expect(result.current.setPropOverrides(null)).toBe(null);
    });
  });

  describe("asDialog", () => {
    it("renders with initialProps and allows setting props and closing", () => {
      const Inner = () => {
        const { setProps, close } = useContext(DialogWrapperContext);
        return (
          <div>
            <button
              data-testid="set-title"
              onClick={() => setProps({ title: "Updated Title" } as any)}
            >
              Set Title
            </button>
            <button data-testid="inner-close" onClick={close}>
              Inner Close
            </button>
          </div>
        );
      };

      const WrappedDialog = asDialog({ title: "Initial Title" } as any)(Inner);
      const onClose = vi.fn();

      const { rerender } = render(
        <WrappedDialog open={true} onClose={onClose} />,
      );

      const dialog = screen.getByTestId("dialog");
      expect(dialog.getAttribute("data-title")).toBe("Initial Title");

      fireEvent.click(screen.getByTestId("set-title"));
      expect(dialog.getAttribute("data-title")).toBe("Updated Title");

      fireEvent.click(screen.getByTestId("inner-close"));
      expect(onClose).toHaveBeenCalled();

      // Without initialProps
      const NoPropsDialog = asDialog()(Inner);
      rerender(<NoPropsDialog open={true} onClose={onClose} />);
      expect(screen.getByTestId("dialog")).toBeDefined();
    });
  });

  describe("asModal", () => {
    it("handles initial hidden state and prop-driven visibility toggle", () => {
      const Inner = () => <div>Modal Content</div>;
      const ModalComp = asModal({ closeOnBackground: true })(Inner);

      const { rerender } = render(<ModalComp visible={false} />);
      expect(screen.queryByTestId("modal")).toBeNull();

      // Show modal
      rerender(<ModalComp visible={true} />);
      expect(screen.getByTestId("modal")).toBeDefined();
      expect(screen.getByText("Modal Content")).toBeDefined();

      // Hide modal via prop
      rerender(<ModalComp visible={false} />);
      expect(screen.getByTestId("modal").getAttribute("data-visible")).toBe(
        "false",
      );
    });

    it("supports functional modalProps, propOverrides, dismiss, and onModalDismissed", () => {
      let modalCtx: any;
      const Inner = ({ prefix }: { prefix: string }) => {
        const ctx = useContext(ModalContext);
        React.useEffect(() => {
          modalCtx = ctx;
        });
        return <div>{prefix} Inner Content</div>;
      };

      const ModalComp = asModal<{ prefix: string }>((_props) => ({
        closeOnBackground: false,
      }))(Inner);

      const onModalDismissed = vi.fn();
      render(
        <ModalComp
          visible={true}
          prefix="Hello"
          onModalDismissed={onModalDismissed}
        />,
      );

      expect(screen.getByText("Hello Inner Content")).toBeDefined();

      // Override with object
      act(() => {
        modalCtx.setPropOverrides({ showSpinner: true });
      });
      expect(screen.getByTestId("modal").getAttribute("data-spinner")).toBe(
        "true",
      );

      // Override with function
      act(() => {
        modalCtx.setPropOverrides((prev: any) => ({ ...prev, top: true }));
      });
      expect(screen.getByTestId("modal").getAttribute("data-top")).toBe("true");

      // Reset overrides with null
      act(() => {
        modalCtx.setPropOverrides(null);
      });
      expect(screen.getByTestId("modal").getAttribute("data-top")).toBeNull();

      // Dismiss via context
      act(() => {
        modalCtx.dismiss();
      });
      expect(screen.getByTestId("modal").getAttribute("data-visible")).toBe(
        "false",
      );

      // Dismiss button triggers onDismissed callback
      fireEvent.click(screen.getByTestId("modal-dismiss"));
      expect(onModalDismissed).toHaveBeenCalled();

      // Dismiss without onModalDismissed callback
      const SimpleModal = asModal<{ prefix: string }>()(Inner);
      render(<SimpleModal visible={true} prefix="Simple" />);
      fireEvent.click(screen.getAllByTestId("modal-dismiss")[0]);

      // Setting overrides when not rendered resets them back to empty object
      const ref = React.createRef<any>();
      render(
        <ModalComp
          {...({ ref, visible: false, prefix: "Unrendered" } as any)}
        />,
      );
      act(() => {
        ref.current.setPropOverrides({ showSpinner: true });
      });
      expect(ref.current.state.propOverrides).toEqual({});
    });
  });
});
