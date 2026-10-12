import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FileEditContainer from "./FileEditContainer";
import getFileContents from "@/api/server/files/getFileContents";
import saveFileContents from "@/api/server/files/saveFileContents";
import { MemoryRouter, Routes, Route } from "react-router";

vi.mock("@/api/server/files/getFileContents", () => ({
  default: vi.fn().mockResolvedValue("server.port=25565\nmotd=Aqua"),
}));

vi.mock("@/api/server/files/saveFileContents", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/components/elements/SpinnerOverlay", () => ({
  default: () => null,
}));

vi.mock("@/components/elements/CodemirrorEditor", () => ({
  default: ({ fetchContent, initialContent }: any) => {
    React.useEffect(() => {
      fetchContent?.(() =>
        Promise.resolve(initialContent || "server.port=25565"),
      );
    }, [fetchContent, initialContent]);
    return <div data-testid="codemirror-editor" />;
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
  default: ({ visible, onFileNamed }: any) =>
    visible ? (
      <div data-testid="filename-modal">
        <button onClick={() => onFileNamed("config.yml")}>
          Confirm File Name
        </button>
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
  });
});
