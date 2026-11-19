import React, { createRef } from "react";
import { act, render, screen } from "@testing-library/react";
import { CSSTransition } from "./CSSTransition";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("animates legacy appear/exit classes and preserves node arguments without findDOMNode", () => {
  const callbacks = {
    onEnter: vi.fn(),
    onEntering: vi.fn(),
    onEntered: vi.fn(),
    onExit: vi.fn(),
    onExiting: vi.fn(),
    onExited: vi.fn(),
  };
  const child = <div>Legacy transition</div>;
  const view = render(
    <CSSTransition
      in
      appear
      timeout={150}
      classNames="fade"
      unmountOnExit
      {...callbacks}
    >
      {child}
    </CSSTransition>,
  );
  const node = screen.getByText("Legacy transition");
  expect(node.classList.contains("fade-appear-active")).toBe(true);
  expect(callbacks.onEnter).toHaveBeenCalledWith(node, true);
  expect(callbacks.onEntering).toHaveBeenCalledWith(node, true);
  act(() => vi.advanceTimersByTime(150));
  expect(callbacks.onEntered).toHaveBeenCalledWith(node, true);
  expect(node.classList.contains("fade-appear-done")).toBe(true);
  view.rerender(
    <CSSTransition
      in={false}
      timeout={150}
      classNames="fade"
      unmountOnExit
      {...callbacks}
    >
      {child}
    </CSSTransition>,
  );
  expect(node.classList.contains("fade-exit-active")).toBe(true);
  expect(callbacks.onExit).toHaveBeenCalledWith(node);
  expect(callbacks.onExiting).toHaveBeenCalledWith(node);
  act(() => vi.advanceTimersByTime(150));
  expect(callbacks.onExited).toHaveBeenCalledWith(node);
  expect(screen.queryByText("Legacy transition")).toBeNull();
});

it("respects explicit nodeRef and its callback convention", () => {
  const nodeRef = createRef<HTMLDivElement>();
  const onEnter = vi.fn();
  render(
    <CSSTransition in appear timeout={10} nodeRef={nodeRef} onEnter={onEnter}>
      <div ref={nodeRef}>Explicit reference</div>
    </CSSTransition>,
  );
  expect(nodeRef.current).toBe(screen.getByText("Explicit reference"));
  expect(onEnter.mock.calls[0][0]).toBe(true);
  act(() => vi.advanceTimersByTime(10));
});

it("passes the DOM node and completion callback to legacy end listeners", () => {
  const listener = vi.fn();
  const view = render(
    <CSSTransition in={false} mountOnEnter addEndListener={listener}>
      <div>Listener transition</div>
    </CSSTransition>,
  );
  expect(screen.queryByText("Listener transition")).toBeNull();
  view.rerender(
    <CSSTransition in mountOnEnter addEndListener={listener}>
      <div>Listener transition</div>
    </CSSTransition>,
  );
  const node = screen.getByText("Listener transition");
  expect(listener.mock.calls[0][0]).toBe(node);
  act(() => listener.mock.calls[0][1]());
});

it("preserves object refs when adding the internal transition ref", () => {
  const childRef = createRef<HTMLDivElement>();
  const view = render(
    <CSSTransition in timeout={0}>
      <div ref={childRef}>Object reference</div>
    </CSSTransition>,
  );
  expect(childRef.current).toBe(screen.getByText("Object reference"));
  view.unmount();
  expect(childRef.current).toBeNull();
});

it("preserves callback refs and React 19 callback cleanup", () => {
  const childRef = vi.fn();
  const view = render(
    <CSSTransition in timeout={0}>
      <div ref={childRef}>Callback reference</div>
    </CSSTransition>,
  );
  expect(childRef).toHaveBeenCalledWith(screen.getByText("Callback reference"));
  view.unmount();
  expect(childRef).toHaveBeenCalledWith(null);
  const cleanup = vi.fn();
  const cleanupRef = vi.fn(() => cleanup);
  const second = render(
    <CSSTransition in timeout={0}>
      <div ref={cleanupRef}>Cleanup reference</div>
    </CSSTransition>,
  );
  expect(cleanupRef).toHaveBeenCalledWith(
    screen.getByText("Cleanup reference"),
  );
  second.unmount();
  expect(cleanup).toHaveBeenCalledOnce();
});
