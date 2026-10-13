import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CodemirrorEditor from "./CodemirrorEditor";
import { LanguageSupport } from "@codemirror/language";

let lastEditorProps: any = null;
let currentMockView: any = null;

vi.mock("@uiw/react-codemirror", () => {
  const MockCodeMirror = React.forwardRef((props: any, ref: any) => {
    React.useEffect(() => {
      lastEditorProps = props;
    });
    React.useImperativeHandle(ref, () => ({
      get view() {
        return currentMockView;
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
    currentMockView = {
      state: {
        doc: {
          toString: () => lastEditorProps?.value ?? "",
        },
      },
    };
  });

  it("detects mime mode from filename extension and regex, and handles filename without ext or undefined", () => {
    const onModeChanged = vi.fn();

    const { rerender } = render(
      <CodemirrorEditor
        filename="server.json"
        mode="text/plain"
        onModeChanged={onModeChanged}
        fetchContent={vi.fn()}
        onContentSaved={vi.fn()}
      />,
    );
    expect(onModeChanged).toHaveBeenCalledWith("application/json");

    rerender(
      <CodemirrorEditor
        filename="Dockerfile"
        mode="text/plain"
        onModeChanged={onModeChanged}
        fetchContent={vi.fn()}
        onContentSaved={vi.fn()}
      />,
    );
    expect(onModeChanged).toHaveBeenCalledWith("text/x-dockerfile");

    rerender(
      <CodemirrorEditor
        filename="no_extension_file"
        mode="text/plain"
        onModeChanged={onModeChanged}
        fetchContent={vi.fn()}
        onContentSaved={vi.fn()}
      />,
    );
    expect(onModeChanged).toHaveBeenCalledWith("text/plain");

    rerender(
      <CodemirrorEditor
        mode="text/plain"
        onModeChanged={onModeChanged}
        fetchContent={vi.fn()}
        onContentSaved={vi.fn()}
      />,
    );
  });

  it("updates content when initialContent changes or is undefined", () => {
    const { rerender } = render(
      <CodemirrorEditor
        mode="text/plain"
        onModeChanged={vi.fn()}
        fetchContent={vi.fn()}
        onContentSaved={vi.fn()}
      />,
    );

    expect(
      (screen.getByTestId("cm-textarea") as HTMLTextAreaElement).value,
    ).toBe("");

    rerender(
      <CodemirrorEditor
        initialContent="first content"
        mode="text/plain"
        onModeChanged={vi.fn()}
        fetchContent={vi.fn()}
        onContentSaved={vi.fn()}
      />,
    );
    expect(
      (screen.getByTestId("cm-textarea") as HTMLTextAreaElement).value,
    ).toBe("first content");

    rerender(
      <CodemirrorEditor
        initialContent="second content"
        mode="text/plain"
        onModeChanged={vi.fn()}
        fetchContent={vi.fn()}
        onContentSaved={vi.fn()}
      />,
    );
    expect(
      (screen.getByTestId("cm-textarea") as HTMLTextAreaElement).value,
    ).toBe("second content");
  });

  it("provides fetchContent callback and handles fallback when view is null", async () => {
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

    // View is null fallback
    currentMockView = null;
    const fallbackContent = await capturedCallback!();
    expect(fallbackContent).toBe("updated text");
  });

  it("triggers onContentSaved from saveKeymap Mod-s shortcut", () => {
    const onContentSaved = vi.fn();

    render(
      <CodemirrorEditor
        mode="text/plain"
        onModeChanged={vi.fn()}
        fetchContent={vi.fn()}
        onContentSaved={onContentSaved}
      />,
    );

    expect(lastEditorProps?.extensions).toBeDefined();

    // Look for the extension facet containing Mod-s keymap
    const keymapExt = lastEditorProps.extensions.find(
      (ext: any) =>
        ext?.value && Array.isArray(ext.value) && ext.value[0]?.key === "Mod-s",
    );

    expect(keymapExt).toBeDefined();
    const result = keymapExt.value[0].run();
    expect(result).toBe(true);
    expect(onContentSaved).toHaveBeenCalledTimes(1);
  });

  it("catches error when language extension loading fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <CodemirrorEditor
        mode={undefined as any}
        onModeChanged={vi.fn()}
        fetchContent={vi.fn()}
        onContentSaved={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to load CodeMirror language extension:",
        expect.any(Error),
      );
    });

    consoleSpy.mockRestore();
  });

  it("loads all supported language extensions without error", async () => {
    const modesToTest = [
      "application/json",
      "text/javascript",
      "text/x-vue",
      "text/html",
      "application/xml",
      "text/x-sass",
      "text/css",
      "text/x-markdown",
      "text/x-python",
      "application/x-httpd-php",
      "text/x-rustsrc",
      "text/x-sql",
      "text/x-csharp",
      "text/x-java",
      "text/x-csrc",
      "text/x-yaml",
      "text/x-sh",
      "text/x-dockerfile",
      "text/x-nginx-conf",
      "text/x-toml",
      "text/x-diff",
      "text/x-ruby",
      "text/x-go",
      "text/x-lua",
      "text/x-perl",
      "text/x-swift",
      "text/x-properties",
      "text/x-protobuf",
      "text/x-pug",
      "text/x-rpm-spec",
      "message/http",
      "text/x-erlang",
      "text/x-julia",
      "text/x-brainfuck",
      "unknown-unsupported-mode",
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
        expect(lastEditorProps?.extensions.length).toBeGreaterThanOrEqual(5);
      });
      unmount();
    }
  });

  it("cancels setting language extension when unmounted before promise resolves", () => {
    const { unmount } = render(
      <CodemirrorEditor
        mode="application/json"
        onModeChanged={vi.fn()}
        fetchContent={vi.fn()}
        onContentSaved={vi.fn()}
      />,
    );
    expect(() => unmount()).not.toThrow();
  });

  it("installs the asynchronously loaded JSON language support", async () => {
    render(
      <CodemirrorEditor
        initialContent={'{"enabled": true}'}
        mode="application/json"
        onModeChanged={vi.fn()}
        fetchContent={vi.fn()}
        onContentSaved={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(
        lastEditorProps.extensions.some(
          (extension: unknown) => extension instanceof LanguageSupport,
        ),
      ).toBe(true);
    });
    expect(
      (screen.getByTestId("cm-textarea") as HTMLTextAreaElement).value,
    ).toBe('{"enabled": true}');
  });
});
