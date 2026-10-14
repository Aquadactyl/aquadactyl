import React, { useEffect, useMemo, useRef, useState } from "react";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
// Base extensions
import { EditorState, Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { indentUnit } from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";

import modes from "@/modes";
import { LARGE_FILE_THRESHOLD } from "@/lib/filePreview";

export interface Props {
  style?: React.CSSProperties;
  initialContent?: string;
  mode: string;
  filename?: string;
  onModeChanged: (mode: string) => void;
  fetchContent: (callback: () => Promise<string>) => void;
  onContentSaved: () => void;
  onContentChanged?: (content: string) => void;
}

const findModeByFilename = (filename: string) => {
  for (let i = 0; i < modes.length; i++) {
    const info = modes[i];

    if (info.file && info.file.test(filename)) {
      return info;
    }
  }

  const dot = filename.lastIndexOf(".");
  const ext = dot > -1 && filename.substring(dot + 1, filename.length);

  if (ext) {
    for (let i = 0; i < modes.length; i++) {
      const info = modes[i];
      if (info.ext) {
        for (let j = 0; j < info.ext.length; j++) {
          if (info.ext[j] === ext) {
            return info;
          }
        }
      }
    }
  }

  return undefined;
};

const getLanguageExtension = async (mode: string): Promise<Extension> => {
  const normalized = mode.toLowerCase();

  // JavaScript / TypeScript / JSON
  if (normalized.includes("json")) {
    const { json } = await import("@codemirror/lang-json");
    return json();
  }
  if (
    normalized.includes("javascript") ||
    normalized.includes("ecmascript") ||
    normalized === "js" ||
    normalized === "ts"
  ) {
    const { javascript } = await import("@codemirror/lang-javascript");
    return javascript();
  }

  // HTML / XML / Vue
  if (normalized.includes("vue")) {
    const { vue } = await import("@codemirror/lang-vue");
    return vue();
  }
  if (normalized.includes("html")) {
    const { html } = await import("@codemirror/lang-html");
    return html();
  }
  if (normalized.includes("xml")) {
    const { xml } = await import("@codemirror/lang-xml");
    return xml();
  }

  // CSS / SASS
  if (normalized.includes("sass")) {
    const [{ StreamLanguage }, { sass }] = await Promise.all([
      import("@codemirror/language"),
      import("@codemirror/legacy-modes/mode/sass"),
    ]);
    return StreamLanguage.define(sass);
  }
  if (normalized.includes("css")) {
    const { css } = await import("@codemirror/lang-css");
    return css();
  }

  // Markdown
  if (normalized.includes("markdown") || normalized.includes("gfm")) {
    const { markdown } = await import("@codemirror/lang-markdown");
    return markdown();
  }

  // Python
  if (normalized.includes("python")) {
    const { python } = await import("@codemirror/lang-python");
    return python();
  }

  // PHP
  if (normalized.includes("php")) {
    const { php } = await import("@codemirror/lang-php");
    return php();
  }

  // Rust
  if (normalized.includes("rust")) {
    const { rust } = await import("@codemirror/lang-rust");
    return rust();
  }

  // SQL / DBs
  if (
    normalized.includes("sql") ||
    normalized.includes("mariadb") ||
    normalized.includes("cassandra")
  ) {
    const { sql } = await import("@codemirror/lang-sql");
    return sql();
  }

  // C / C++ / C# / Java
  if (
    normalized.includes("csharp") ||
    normalized === "cs" ||
    normalized === "text/x-csharp"
  ) {
    const [{ StreamLanguage }, { csharp }] = await Promise.all([
      import("@codemirror/language"),
      import("@codemirror/legacy-modes/mode/clike"),
    ]);
    return StreamLanguage.define(csharp);
  }
  if (normalized.includes("java") && !normalized.includes("javascript")) {
    const { java } = await import("@codemirror/lang-java");
    return java();
  }
  if (
    normalized.includes("csrc") ||
    normalized.includes("c++src") ||
    normalized.includes("clike")
  ) {
    const { cpp } = await import("@codemirror/lang-cpp");
    return cpp();
  }

  // YAML
  if (normalized.includes("yaml")) {
    const { yaml: yamlLang } = await import("@codemirror/lang-yaml");
    return yamlLang();
  }

  // Shell / Docker / Nginx
  if (normalized.includes("sh") || normalized.includes("shell")) {
    const [{ StreamLanguage }, { shell }] = await Promise.all([
      import("@codemirror/language"),
      import("@codemirror/legacy-modes/mode/shell"),
    ]);
    return StreamLanguage.define(shell);
  }
  if (normalized.includes("dockerfile")) {
    const [{ StreamLanguage }, { dockerFile }] = await Promise.all([
      import("@codemirror/language"),
      import("@codemirror/legacy-modes/mode/dockerfile"),
    ]);
    return StreamLanguage.define(dockerFile);
  }
  if (normalized.includes("nginx")) {
    const [{ StreamLanguage }, { nginx }] = await Promise.all([
      import("@codemirror/language"),
      import("@codemirror/legacy-modes/mode/nginx"),
    ]);
    return StreamLanguage.define(nginx);
  }

  // TOML
  if (normalized.includes("toml")) {
    const [{ StreamLanguage }, { toml }] = await Promise.all([
      import("@codemirror/language"),
      import("@codemirror/legacy-modes/mode/toml"),
    ]);
    return StreamLanguage.define(toml);
  }

  // Diff
  if (normalized.includes("diff") || normalized.includes("patch")) {
    const [{ StreamLanguage }, { diff }] = await Promise.all([
      import("@codemirror/language"),
      import("@codemirror/legacy-modes/mode/diff"),
    ]);
    return StreamLanguage.define(diff);
  }

  // Other legacy modes
  if (normalized.includes("ruby")) {
    const [{ StreamLanguage }, { ruby }] = await Promise.all([
      import("@codemirror/language"),
      import("@codemirror/legacy-modes/mode/ruby"),
    ]);
    return StreamLanguage.define(ruby);
  }
  if (normalized.includes("go")) {
    const [{ StreamLanguage }, { go }] = await Promise.all([
      import("@codemirror/language"),
      import("@codemirror/legacy-modes/mode/go"),
    ]);
    return StreamLanguage.define(go);
  }
  if (normalized.includes("lua")) {
    const [{ StreamLanguage }, { lua }] = await Promise.all([
      import("@codemirror/language"),
      import("@codemirror/legacy-modes/mode/lua"),
    ]);
    return StreamLanguage.define(lua);
  }
  if (normalized.includes("perl")) {
    const [{ StreamLanguage }, { perl }] = await Promise.all([
      import("@codemirror/language"),
      import("@codemirror/legacy-modes/mode/perl"),
    ]);
    return StreamLanguage.define(perl);
  }
  if (normalized.includes("swift")) {
    const [{ StreamLanguage }, { swift }] = await Promise.all([
      import("@codemirror/language"),
      import("@codemirror/legacy-modes/mode/swift"),
    ]);
    return StreamLanguage.define(swift);
  }
  if (normalized.includes("properties")) {
    const [{ StreamLanguage }, { properties }] = await Promise.all([
      import("@codemirror/language"),
      import("@codemirror/legacy-modes/mode/properties"),
    ]);
    return StreamLanguage.define(properties);
  }
  if (normalized.includes("protobuf")) {
    const [{ StreamLanguage }, { protobuf }] = await Promise.all([
      import("@codemirror/language"),
      import("@codemirror/legacy-modes/mode/protobuf"),
    ]);
    return StreamLanguage.define(protobuf);
  }
  if (normalized.includes("pug")) {
    const [{ StreamLanguage }, { pug }] = await Promise.all([
      import("@codemirror/language"),
      import("@codemirror/legacy-modes/mode/pug"),
    ]);
    return StreamLanguage.define(pug);
  }
  if (normalized.includes("rpm")) {
    const [{ StreamLanguage }, { rpmSpec }] = await Promise.all([
      import("@codemirror/language"),
      import("@codemirror/legacy-modes/mode/rpm"),
    ]);
    return StreamLanguage.define(rpmSpec);
  }
  if (normalized.includes("http")) {
    const [{ StreamLanguage }, { http }] = await Promise.all([
      import("@codemirror/language"),
      import("@codemirror/legacy-modes/mode/http"),
    ]);
    return StreamLanguage.define(http);
  }
  if (normalized.includes("erlang")) {
    const [{ StreamLanguage }, { erlang }] = await Promise.all([
      import("@codemirror/language"),
      import("@codemirror/legacy-modes/mode/erlang"),
    ]);
    return StreamLanguage.define(erlang);
  }
  if (normalized.includes("julia")) {
    const [{ StreamLanguage }, { julia }] = await Promise.all([
      import("@codemirror/language"),
      import("@codemirror/legacy-modes/mode/julia"),
    ]);
    return StreamLanguage.define(julia);
  }
  if (normalized.includes("brainfuck")) {
    const [{ StreamLanguage }, { brainfuck }] = await Promise.all([
      import("@codemirror/language"),
      import("@codemirror/legacy-modes/mode/brainfuck"),
    ]);
    return StreamLanguage.define(brainfuck);
  }

  return [];
};

const customTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      fontSize: "12px",
      backgroundColor: "#1f2430",
      color: "#cbccc6",
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      lineHeight: "1.375rem",
    },
    ".cm-content": {
      padding: "8px 0",
    },
    ".cm-gutters": {
      backgroundColor: "#191e2a",
      color: "#707a8c",
      borderRight: "1px solid rgba(255, 255, 255, 0.05)",
    },
    ".cm-gutterElement": {
      padding: "0 12px !important",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(255, 255, 255, 0.04)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(255, 255, 255, 0.08)",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "#ffcc66",
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "#34455a !important",
    },
  },
  { dark: true },
);

export default ({
  style,
  initialContent,
  filename,
  mode,
  fetchContent,
  onContentSaved,
  onModeChanged,
  onContentChanged,
}: Props) => {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const [content, setContent] = useState<string>(initialContent ?? "");
  const contentRef = useRef<string>(initialContent ?? "");
  const lightweight = (initialContent?.length ?? 0) > LARGE_FILE_THRESHOLD;

  const onContentSavedRef = useRef(onContentSaved);
  onContentSavedRef.current = onContentSaved;

  const onContentChangedRef = useRef(onContentChanged);
  onContentChangedRef.current = onContentChanged;

  useEffect(() => {
    if (filename === undefined) return;
    onModeChanged(
      lightweight
        ? "text/plain"
        : findModeByFilename(filename)?.mime || "text/plain",
    );
  }, [filename, lightweight]);

  useEffect(() => {
    if (initialContent !== undefined) {
      setContent(initialContent);
      contentRef.current = initialContent;
    }
  }, [initialContent]);

  useEffect(() => {
    fetchContent(() => {
      const currentDoc =
        editorRef.current?.view?.state.doc.toString() ?? contentRef.current;
      return Promise.resolve(currentDoc);
    });
  }, [fetchContent]);

  const [langExtension, setLangExtension] = useState<Extension>([]);

  useEffect(() => {
    if (lightweight) {
      setLangExtension([]);
      return;
    }
    let cancelled = false;
    getLanguageExtension(mode)
      .then((ext) => {
        if (!cancelled) setLangExtension(ext);
      })
      .catch((err) => {
        console.error("Failed to load CodeMirror language extension:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, lightweight]);

  const extensions = useMemo(() => {
    const saveKeymap = keymap.of([
      {
        key: "Mod-s",
        run: () => {
          onContentSavedRef.current();
          return true;
        },
      },
    ]);

    return [
      ...(lightweight ? [] : [EditorView.lineWrapping]),
      EditorState.tabSize.of(4),
      indentUnit.of("    "),
      customTheme,
      saveKeymap,
      ...(Array.isArray(langExtension) ? langExtension : [langExtension]),
    ];
  }, [langExtension, lightweight]);

  const handleChange = (val: string) => {
    contentRef.current = val;
    setContent(val);
    onContentChangedRef.current?.(val);
  };

  return (
    <div
      style={style}
      className="relative h-[calc(100vh-20rem)] min-h-64 [&_.cm-editor]:h-full [&_.cm-editor]:rounded-lg [&>div]:h-full [&>div]:rounded-lg"
    >
      <CodeMirror
        ref={editorRef}
        value={content}
        height="100%"
        className="h-full rounded-lg"
        theme={oneDark}
        basicSetup={
          lightweight
            ? {
                foldGutter: false,
                highlightActiveLine: false,
                highlightActiveLineGutter: false,
                highlightSelectionMatches: false,
                syntaxHighlighting: false,
                bracketMatching: false,
                closeBrackets: false,
                autocompletion: false,
              }
            : true
        }
        extensions={extensions}
        onChange={handleChange}
      />
    </div>
  );
};
