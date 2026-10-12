import { describe, expect, it, vi, beforeEach } from "vitest";

const mockRender = vi.fn();
const mockCreateRoot = vi.fn((_el?: any) => ({
  render: mockRender,
}));

vi.mock("react-dom/client", () => ({
  createRoot: (el: any) => mockCreateRoot(el),
}));
vi.mock("@/components/App", () => ({
  default: () => null,
}));
vi.mock("./i18n", () => ({}));

describe("index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    vi.resetModules();
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
});
