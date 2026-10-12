import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CodemirrorEditor from "./CodemirrorEditor";

let lastEditorProps: any = null;
vi.mock("@uiw/react-codemirror", () => {
  const MockCodeMirror = React.forwardRef((props: any, ref: any) => {
    React.useEffect(() => {
      lastEditorProps = props;
    });
    React.useImperativeHandle(ref, () => ({
      view: {
        state: {
          doc: {
            toString: () => props.value,
          },
        },
      },
    }));
    return (
      <div data-testid="codemirror-wrapper">
        <textarea
          data-testid="cm-textarea"
          value={props.value}
          onChange={(e) => props.onChange?.(e.target.value)}
        />
      </div>
    );
  });
  return { default: MockCodeMirror };
});

describe("components/elements/CodemirrorEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastEditorProps = null;
  });

  it("detects mime mode from filename extension and regex", () => {
    const onModeChanged = vi.fn();
    const fetchContent = vi.fn();
    const onContentSaved = vi.fn();

    const { rerender } = render(
      <CodemirrorEditor
        filename="server.json"
        mode="text/plain"
        onModeChanged={onModeChanged}
        fetchContent={fetchContent}
        onContentSaved={onContentSaved}
      />,
    );

    expect(onModeChanged).toHaveBeenCalledWith("application/json");

    rerender(
      <CodemirrorEditor
        filename="Dockerfile"
        mode="text/plain"
        onModeChanged={onModeChanged}
        fetchContent={fetchContent}
        onContentSaved={onContentSaved}
      />,
    );
    expect(onModeChanged).toHaveBeenCalledWith("text/x-dockerfile");

    rerender(
      <CodemirrorEditor
        filename="unknown.unrecognized"
        mode="text/plain"
        onModeChanged={onModeChanged}
        fetchContent={fetchContent}
        onContentSaved={onContentSaved}
      />,
    );
    expect(onModeChanged).toHaveBeenCalledWith("text/plain");
  });

  it("provides fetchContent callback resolving to current content", async () => {
    let capturedCallback: (() => Promise<string>) | null = null;
    const fetchContent = vi.fn((cb) => {
      capturedCallback = cb;
    });
    const onContentChanged = vi.fn();

    render(
      <CodemirrorEditor
        initialContent="hello world"
        mode="text/plain"
        onModeChanged={vi.fn()}
        fetchContent={fetchContent}
        onContentSaved={vi.fn()}
        onContentChanged={onContentChanged}
      />,
    );

    expect(capturedCallback).not.toBeNull();
    const content = await capturedCallback!();
    expect(content).toBe("hello world");

    // Change content via textarea
    const textarea = screen.getByTestId("cm-textarea");
    fireEvent.change(textarea, { target: { value: "updated text" } });

    expect(onContentChanged).toHaveBeenCalledWith("updated text");
    const updated = await capturedCallback!();
    expect(updated).toBe("updated text");
  });

  it("loads language extensions for various modes without error", async () => {
    const modesToTest = [
      "application/json",
      "text/javascript",
      "text/html",
      "text/x-python",
      "text/x-yaml",
      "text/x-markdown",
      "text/x-csrc",
      "text/x-rustsrc",
      "text/x-sql",
      "text/css",
      "text/plain",
    ];

    for (const testMode of modesToTest) {
      const { unmount } = render(
        <CodemirrorEditor
          initialContent=""
          mode={testMode}
          onModeChanged={vi.fn()}
          fetchContent={vi.fn()}
          onContentSaved={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(lastEditorProps?.extensions).toBeDefined();
      });
      unmount();
    }
  });
});
