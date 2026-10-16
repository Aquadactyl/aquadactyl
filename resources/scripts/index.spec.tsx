import { describe, expect, it, vi, beforeEach } from "vitest";

const mockRender = vi.fn();
const mockCreateRoot = vi.fn((_el?: any) => ({
  render: mockRender,
}));
const mockLoadRouter = vi.fn();

vi.mock("react-dom/client", () => ({
  createRoot: (el: any) => mockCreateRoot(el),
}));
vi.mock("@/components/App", () => ({
  default: () => null,
}));
vi.mock("./i18n", () => ({}));
vi.mock("@/routers/initialRouter", () => ({
  loadInitialRouter: (...args: unknown[]) => mockLoadRouter(...args),
}));

describe("index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    vi.resetModules();
    mockLoadRouter.mockResolvedValue({
      kind: "dashboard",
      Component: () => null,
    });
  });

  it("does not render when #app container is missing", async () => {
    await import("./index");
    expect(mockCreateRoot).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
  });

  it("mounts App into #app when container exists", async () => {
    const appDiv = document.createElement("div");
    appDiv.id = "app";
    document.body.appendChild(appDiv);

    await import("./index");
    expect(mockCreateRoot).toHaveBeenCalledWith(appDiv);
    expect(mockRender).toHaveBeenCalled();
  });

  it("falls back to App's lazy route error boundary if initial loading fails", async () => {
    document.body.innerHTML = '<div id="app"></div>';
    mockLoadRouter.mockRejectedValue(new Error("Chunk unavailable"));
    await import("./index");
    await vi.waitFor(() => expect(mockRender).toHaveBeenCalledTimes(2));
    expect(mockRender.mock.calls[1][0].props.initialRouter).toBeUndefined();
  });
});
