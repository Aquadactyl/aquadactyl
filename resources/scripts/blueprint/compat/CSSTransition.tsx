import React, { cloneElement, useCallback, useRef } from "react";
import { CSSTransition as NativeCSSTransition } from "react-transition-group";
import type { CSSTransitionProps } from "react-transition-group/CSSTransition";

type Props = Omit<CSSTransitionProps<HTMLElement | undefined>, "children"> & {
  children: React.ReactElement<{ ref?: React.Ref<HTMLElement> }>;
};

function setRef(
  ref: React.Ref<HTMLElement> | undefined,
  node: HTMLElement | null,
) {
  if (typeof ref === "function") return ref(node);
  if (ref) ref.current = node;
  return undefined;
}

// Legacy addons omit nodeRef; supply it without ReactDOM.findDOMNode (removed in React 19).
export function CSSTransition({ children, nodeRef, ...props }: Props) {
  const fallback = useRef<HTMLElement>(null);
  const childRef = children.props.ref;
  const attach = useCallback(
    (node: HTMLElement | null) => {
      fallback.current = node;
      const cleanup = setRef(childRef, node);
      if (typeof cleanup === "function")
        return () => {
          fallback.current = null;
          cleanup();
        };
      return undefined;
    },
    [childRef],
  );
  const forwarded = { ...props } as CSSTransitionProps<HTMLElement>;

  if (!nodeRef) {
    // Preserve legacy callback arguments when the adapter supplies the ref.
    for (const event of ["onEnter", "onEntering", "onEntered"] as const) {
      const callback = props[event] as
        | ((node: HTMLElement, appearing: boolean) => void)
        | undefined;
      if (callback)
        forwarded[event] = (appearing: boolean) =>
          callback(fallback.current!, appearing);
    }
    for (const event of ["onExit", "onExiting", "onExited"] as const) {
      const callback = props[event] as
        | ((node: HTMLElement) => void)
        | undefined;
      if (callback) forwarded[event] = () => callback(fallback.current!);
    }
    const listener = props.addEndListener as
      | ((node: HTMLElement, done: () => void) => void)
      | undefined;
    if (listener)
      forwarded.addEndListener = (done: () => void) =>
        listener(fallback.current!, done);
  }

  return (
    <NativeCSSTransition {...forwarded} nodeRef={nodeRef ?? fallback}>
      {nodeRef ? children : cloneElement(children, { ref: attach })}
    </NativeCSSTransition>
  );
}
