import React, { useEffect, useMemo, useRef } from "react";
import styled from "styled-components";
import { Compartment, EditorState, Extension } from "@codemirror/state";
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { oneDark } from "@codemirror/theme-one-dark";

// Language packages
import { cpp } from "@codemirror/lang-cpp";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { php } from "@codemirror/lang-php";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { sql } from "@codemirror/lang-sql";
import { vue } from "@codemirror/lang-vue";
import { xml } from "@codemirror/lang-xml";
import { yaml as yamlLang } from "@codemirror/lang-yaml";

// Legacy modes
import { csharp } from "@codemirror/legacy-modes/mode/clike";
import { diff } from "@codemirror/legacy-modes/mode/diff";
import { dockerFile } from "@codemirror/legacy-modes/mode/dockerfile";
import { go } from "@codemirror/legacy-modes/mode/go";
import { http } from "@codemirror/legacy-modes/mode/http";
import { lua } from "@codemirror/legacy-modes/mode/lua";
import { nginx } from "@codemirror/legacy-modes/mode/nginx";
import { properties } from "@codemirror/legacy-modes/mode/properties";
import { protobuf } from "@codemirror/legacy-modes/mode/protobuf";
import { pug } from "@codemirror/legacy-modes/mode/pug";
import { rpmSpec } from "@codemirror/legacy-modes/mode/rpm";
import { ruby } from "@codemirror/legacy-modes/mode/ruby";
import { sass } from "@codemirror/legacy-modes/mode/sass";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { swift } from "@codemirror/legacy-modes/mode/swift";
import { toml } from "@codemirror/legacy-modes/mode/toml";
import { brainfuck } from "@codemirror/legacy-modes/mode/brainfuck";
import { erlang } from "@codemirror/legacy-modes/mode/erlang";
import { julia } from "@codemirror/legacy-modes/mode/julia";
import { perl } from "@codemirror/legacy-modes/mode/perl";

import modes from "@/modes";

const basicSetup: Extension = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
  ]),
];

const EditorContainer = styled.div`
  min-height: 16rem;
  height: calc(100vh - 20rem);
  position: relative;

  > div {
    border-radius: 0.5rem;
    height: 100%;
  }

  .cm-editor {
    height: 100%;
    border-radius: 0.5rem;
  }
`;

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

const getLanguageExtension = (mode: string): Extension => {
  const normalized = mode.toLowerCase();

  // JavaScript / TypeScript / JSON
  if (normalized.includes("json")) return json();
  if (
    normalized.includes("javascript") ||
    normalized.includes("ecmascript") ||
    normalized === "js" ||
    normalized === "ts"
  ) {
    return javascript();
  }

  // HTML / XML / Vue
  if (normalized.includes("vue")) return vue();
  if (normalized.includes("html")) return html();
  if (normalized.includes("xml")) return xml();

  // CSS / SASS
  if (normalized.includes("sass")) return StreamLanguage.define(sass);
  if (normalized.includes("css")) return css();

  // Markdown
  if (normalized.includes("markdown") || normalized.includes("gfm"))
    return markdown();

  // Python
  if (normalized.includes("python")) return python();

  // PHP
  if (normalized.includes("php")) return php();

  // Rust
  if (normalized.includes("rust")) return rust();

  // SQL / DBs
  if (
    normalized.includes("sql") ||
    normalized.includes("mariadb") ||
    normalized.includes("cassandra")
  ) {
    return sql();
  }

  // C / C++ / C# / Java
  if (
    normalized.includes("csharp") ||
    normalized === "cs" ||
    normalized === "text/x-csharp"
  ) {
    return StreamLanguage.define(csharp);
  }
  if (normalized.includes("java") && !normalized.includes("javascript"))
    return java();
  if (
    normalized.includes("csrc") ||
    normalized.includes("c++src") ||
    normalized.includes("clike")
  )
    return cpp();

  // YAML
  if (normalized.includes("yaml")) return yamlLang();

  // Shell / Docker / Nginx
  if (normalized.includes("sh") || normalized.includes("shell"))
    return StreamLanguage.define(shell);
  if (normalized.includes("dockerfile"))
    return StreamLanguage.define(dockerFile);
  if (normalized.includes("nginx")) return StreamLanguage.define(nginx);

  // TOML
  if (normalized.includes("toml")) return StreamLanguage.define(toml);

  // Diff
  if (normalized.includes("diff") || normalized.includes("patch"))
    return StreamLanguage.define(diff);

  // Other legacy modes
  if (normalized.includes("ruby")) return StreamLanguage.define(ruby);
  if (normalized.includes("go")) return StreamLanguage.define(go);
  if (normalized.includes("lua")) return StreamLanguage.define(lua);
  if (normalized.includes("perl")) return StreamLanguage.define(perl);
  if (normalized.includes("swift")) return StreamLanguage.define(swift);
  if (normalized.includes("properties"))
    return StreamLanguage.define(properties);
  if (normalized.includes("protobuf")) return StreamLanguage.define(protobuf);
  if (normalized.includes("pug")) return StreamLanguage.define(pug);
  if (normalized.includes("rpm")) return StreamLanguage.define(rpmSpec);
  if (normalized.includes("http")) return StreamLanguage.define(http);
  if (normalized.includes("erlang")) return StreamLanguage.define(erlang);
  if (normalized.includes("julia")) return StreamLanguage.define(julia);
  if (normalized.includes("brainfuck")) return StreamLanguage.define(brainfuck);

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
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const languageConf = useMemo(() => new Compartment(), []);

  const onContentSavedRef = useRef(onContentSaved);
  onContentSavedRef.current = onContentSaved;

  const onContentChangedRef = useRef(onContentChanged);
  onContentChangedRef.current = onContentChanged;

  useEffect(() => {
    if (!editorRef.current) return;

    const saveKeymap = keymap.of([
      {
        key: "Mod-s",
        run: () => {
          onContentSavedRef.current();
          return true;
        },
      },
    ]);

    const changeListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && onContentChangedRef.current) {
        onContentChangedRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: initialContent || "",
      extensions: [
        basicSetup,
        EditorView.lineWrapping,
        EditorState.tabSize.of(4),
        indentUnit.of("    "),
        oneDark,
        customTheme,
        languageConf.of(getLanguageExtension(mode)),
        saveKeymap,
        changeListener,
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (filename === undefined) return;
    onModeChanged(findModeByFilename(filename)?.mime || "text/plain");
  }, [filename]);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: languageConf.reconfigure(getLanguageExtension(mode)),
      });
    }
  }, [mode, languageConf]);

  useEffect(() => {
    if (viewRef.current && initialContent !== undefined) {
      const currentContent = viewRef.current.state.doc.toString();
      if (currentContent !== initialContent) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: initialContent,
          },
        });
      }
    }
  }, [initialContent]);

  useEffect(() => {
    fetchContent(() =>
      Promise.resolve(viewRef.current?.state.doc.toString() ?? ""),
    );
  }, [fetchContent]);

  return (
    <EditorContainer style={style}>
      <div ref={editorRef} />
    </EditorContainer>
  );
};
