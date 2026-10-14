import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import FileEditContainer from "./FileEditContainer";
import getFileContents from "@/api/server/files/getFileContents";
import saveFileContents from "@/api/server/files/saveFileContents";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router";

vi.mock("@/plugins/usePanelTranslation", () => ({
  default: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

vi.mock("@/api/server/files/getFileContents", () => ({
  default: vi.fn().mockResolvedValue("server.port=25565\nmotd=Aqua"),
}));

vi.mock("@/api/server/files/saveFileContents", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/components/elements/SpinnerOverlay", () => ({
  default: () => null,
}));

vi.mock("@/components/elements/ScreenBlock", () => ({
  ServerError: ({ message, onBack }: any) => (
    <div data-testid="server-error">
      <span>{message}</span>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

let provideFetchContent = true;
vi.mock("@/components/elements/CodemirrorEditor", () => ({
  default: ({
    fetchContent,
    initialContent,
    onContentSaved,
    onContentChanged,
    onModeChanged,
  }: any) => {
    React.useEffect(() => {
      if (provideFetchContent) {
        fetchContent?.(() =>
          Promise.resolve(initialContent || "server.port=25565"),
        );
      }
    }, [fetchContent, initialContent]);
    return (
      <div data-testid="codemirror-editor">
        <button data-testid="btn-save-content" onClick={onContentSaved}>
          Save Shortcut
        </button>
        <button
          data-testid="btn-change-content"
          onClick={() => onContentChanged?.("new draft text")}
        >
          Change Draft
        </button>
        <button
          data-testid="btn-empty-draft"
          onClick={() => onContentChanged?.("")}
        >
          Empty Draft
        </button>
        <button
          data-testid="btn-change-mode"
          onClick={() => onModeChanged?.("application/json")}
        >
          Change Mode
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/elements/Can", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/elements/PageContentBlock", () => ({
  default: ({ title, children }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("@/components/server/files/FileManagerBreadcrumbs", () => ({
  default: () => <div data-testid="breadcrumbs">Breadcrumbs</div>,
}));

vi.mock("@/components/server/files/FileNameModal", () => ({
  default: ({ visible, onFileNamed, onDismissed }: any) =>
    visible ? (
      <div data-testid="filename-modal">
        <button onClick={() => onFileNamed("config.yml")}>
          Confirm File Name
        </button>
        <button onClick={onDismissed}>Cancel File Name</button>
      </div>
    ) : null,
}));

vi.mock("@/components/FlashMessageRender", () => ({
  default: () => null,
}));

vi.mock("@blueprint/components/Server/Files/Edit/BeforeEdit", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Server/Files/Edit/AfterEdit", () => ({
  default: () => null,
}));

const mockSetDirectory = vi.fn();
const mockAddError = vi.fn();
const mockClearFlashes = vi.fn();

vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    addError: mockAddError,
    clearFlashes: mockClearFlashes,
  }),
}));

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        server: { data: { id: "srv-1", uuid: "srv-uuid-1" } },
      }),
    useStoreActions: (selector: any) =>
      selector({
        files: { setDirectory: mockSetDirectory },
      }),
  },
}));

describe("components/server/files/FileEditContainer", () => {
  it("explains large file mode while leaving the full file available to save", async () => {
    const content = "x".repeat(1024 * 1024 + 1);
    vi.mocked(getFileContents).mockResolvedValueOnce(content);
    render(
      <MemoryRouter initialEntries={["/server/srv-1/files/edit#/large.txt"]}>
        <Routes>
          <Route
            path="/server/:id/files/:action"
            element={<FileEditContainer />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Large file mode:/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Save Content" }));
    await waitFor(() =>
      expect(saveFileContents).toHaveBeenCalledWith(
        "srv-uuid-1",
        "/large.txt",
        content,
      ),
    );
  });
  it("ignores an aborted request rejection after leaving the editor", async () => {
    let reject!: (error: Error) => void;
    vi.mocked(getFileContents).mockImplementationOnce(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );
    const { unmount } = render(
      <MemoryRouter initialEntries={["/server/srv-1/files/edit#/pending.txt"]}>
        <Routes>
          <Route
            path="/server/:id/files/:action"
            element={<FileEditContainer />}
          />
        </Routes>
      </MemoryRouter>,
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    unmount();
    await act(async () => {
      reject(new DOMException("Cancelled", "AbortError"));
    });
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
  it("cancels a previous load and prevents saving stale content into the next file", async () => {
    let resolve!: (value: string) => void;
    vi.mocked(getFileContents)
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolve = done;
          }),
      )
      .mockResolvedValueOnce("second file contents");
    const SwitchFile = () => {
      const navigate = useNavigate();
      return (
        <button
          onClick={() => navigate("/server/srv-1/files/edit#/second.txt")}
        >
          Other file
        </button>
      );
    };
    render(
      <MemoryRouter initialEntries={["/server/srv-1/files/edit#/first.txt"]}>
        <Routes>
          <Route
            path="/server/:id/files/:action"
            element={
              <>
                <SwitchFile />
                <FileEditContainer />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(getFileContents).toHaveBeenCalledOnce());
    const signal = vi.mocked(getFileContents).mock.calls[0][2]!;
    fireEvent.click(await screen.findByTestId("btn-save-content"));
    expect(saveFileContents).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Other file"));
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "Save Content",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    expect(signal.aborted).toBe(true);
    await act(async () => {
      resolve("stale first file contents");
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Content" }));
    await waitFor(() =>
      expect(saveFileContents).toHaveBeenCalledWith(
        "srv-uuid-1",
        "/second.txt",
        "second file contents",
      ),
    );
  });
  it("allows saving a new file when the browser draft quota is full", async () => {
    const store = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("Full", "QuotaExceededError");
      });
    render(
      <MemoryRouter initialEntries={["/server/srv-1/files/new#/"]}>
        <Routes>
          <Route
            path="/server/:id/files/:action"
            element={<FileEditContainer />}
          />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("btn-change-content"));
    expect(
      sessionStorage.getItem("pterodactyl:new-file:srv-uuid-1:/"),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Create File" }));
    fireEvent.click(screen.getByText("Confirm File Name"));
    await waitFor(() => expect(saveFileContents).toHaveBeenCalled());
    store.mockRestore();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("loads existing file content when editing", async () => {
    render(
      <MemoryRouter
        initialEntries={["/server/srv-1/files/edit#/server.properties"]}
      >
        <Routes>
          <Route
            path="/server/:id/files/:action"
            element={<FileEditContainer />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getFileContents).toHaveBeenCalledWith(
        "srv-uuid-1",
        "/server.properties",
        expect.any(AbortSignal),
      );
      expect(mockSetDirectory).toHaveBeenCalledWith("/");
    });
  });

  it("saves existing file directly on clicking Save Content", async () => {
    render(
      <MemoryRouter
        initialEntries={["/server/srv-1/files/edit#/server.properties"]}
      >
        <Routes>
          <Route
            path="/server/:id/files/:action"
            element={<FileEditContainer />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getFileContents).toHaveBeenCalled();
    });

    const saveButton = screen.getByRole("button", { name: "Save Content" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(saveFileContents).toHaveBeenCalledWith(
        "srv-uuid-1",
        "/server.properties",
        expect.any(String),
      );
    });
  });

  it("prompts for file name when saving a new file", async () => {
    render(
      <MemoryRouter initialEntries={["/server/srv-1/files/new#/plugins"]}>
        <Routes>
          <Route
            path="/server/:id/files/:action"
            element={<FileEditContainer />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(getFileContents).not.toHaveBeenCalled();

    const createButton = screen.getByRole("button", { name: "Create File" });
    fireEvent.click(createButton);

    expect(screen.getByTestId("filename-modal")).toBeDefined();

    fireEvent.click(screen.getByText("Confirm File Name"));

    await waitFor(() => {
      expect(saveFileContents).toHaveBeenCalledWith(
        "srv-uuid-1",
        "config.yml",
        expect.any(String),
      );
    });
  });

  it("displays error screen if file fetch fails", async () => {
    vi.mocked(getFileContents).mockRejectedValueOnce(
      new Error("File not found"),
    );

    render(
      <MemoryRouter initialEntries={["/server/srv-1/files/edit#/missing.txt"]}>
        <Routes>
          <Route
            path="/server/:id/files/:action"
            element={<FileEditContainer />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/File not found/i)).toBeDefined();
    });

    // Test back button
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
  });

  it("triggers save shortcut from editor in edit mode and in new mode", async () => {
    // Edit mode
    const { unmount } = render(
      <MemoryRouter initialEntries={["/server/srv-1/files/edit#/file.txt"]}>
        <Routes>
          <Route
            path="/server/:id/files/:action"
            element={<FileEditContainer />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(getFileContents).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId("btn-save-content"));
    await waitFor(() => {
      expect(saveFileContents).toHaveBeenCalledWith(
        "srv-uuid-1",
        "/file.txt",
        expect.any(String),
      );
    });
    unmount();

    // New mode
    render(
      <MemoryRouter initialEntries={["/server/srv-1/files/new#/"]}>
        <Routes>
          <Route
            path="/server/:id/files/:action"
            element={<FileEditContainer />}
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId("btn-save-content"));
    expect(screen.getByTestId("filename-modal")).toBeDefined();
    fireEvent.click(screen.getByText("Cancel File Name"));
    expect(screen.queryByTestId("filename-modal")).toBeNull();
  });

  it("handles drafts in sessionStorage for new files", async () => {
    // Set initial draft
    sessionStorage.setItem(
      "pterodactyl:new-file:srv-uuid-1:/",
      "existing draft",
    );

    render(
      <MemoryRouter initialEntries={["/server/srv-1/files/new#/"]}>
        <Routes>
          <Route
            path="/server/:id/files/:action"
            element={<FileEditContainer />}
          />
        </Routes>
      </MemoryRouter>,
    );

    // Change draft
    fireEvent.click(screen.getByTestId("btn-change-content"));
    expect(sessionStorage.getItem("pterodactyl:new-file:srv-uuid-1:/")).toBe(
      "new draft text",
    );

    // Empty draft
    fireEvent.click(screen.getByTestId("btn-empty-draft"));
    expect(
      sessionStorage.getItem("pterodactyl:new-file:srv-uuid-1:/"),
    ).toBeNull();
  });

  it("displays warning banner when editing a .pteroignore file", async () => {
    render(
      <MemoryRouter initialEntries={["/server/srv-1/files/edit#/.pteroignore"]}>
        <Routes>
          <Route
            path="/server/:id/files/:action"
            element={<FileEditContainer />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/You're editing a/)).toBeDefined();
    });
  });

  it("handles mode selection and mode change event", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/server/srv-1/files/edit#/test.json"]}>
        <Routes>
          <Route
            path="/server/:id/files/:action"
            element={<FileEditContainer />}
          />
        </Routes>
      </MemoryRouter>,
    );

    const nativeSelect = container.querySelector(
      ".panel-select-native",
    ) as HTMLSelectElement;
    fireEvent.change(nativeSelect, { target: { value: "text/x-lua" } });
    expect(nativeSelect.value).toBe("text/x-lua");

    // Editor onModeChanged callback
    fireEvent.click(screen.getByTestId("btn-change-mode"));
    expect(nativeSelect.value).toBe("application/json");
  });

  it("handles save failure and records error", async () => {
    vi.mocked(saveFileContents).mockRejectedValueOnce(
      new Error("Failed to write to file"),
    );

    render(
      <MemoryRouter initialEntries={["/server/srv-1/files/edit#/file.txt"]}>
        <Routes>
          <Route
            path="/server/:id/files/:action"
            element={<FileEditContainer />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(getFileContents).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Save Content" }));

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith(
        expect.objectContaining({ key: "files:view" }),
      );
    });
  });

  it("returns early when fetchFileContent is not available", async () => {
    provideFetchContent = false;
    render(
      <MemoryRouter initialEntries={["/server/srv-1/files/edit#/file.txt"]}>
        <Routes>
          <Route
            path="/server/:id/files/:action"
            element={<FileEditContainer />}
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save Content" }));
    expect(saveFileContents).not.toHaveBeenCalled();
    provideFetchContent = true;
  });
});
