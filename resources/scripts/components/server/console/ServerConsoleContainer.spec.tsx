import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import ServerConsoleContainer from "./ServerConsoleContainer";

const uuid = "00000000-0000-4000-8000-000000000123";
vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (select: (state: unknown) => unknown) =>
      select({
        server: {
          data: {
            id: "serv_test",
            uuid: "00000000-0000-4000-8000-000000000123",
            name: "Test server",
            description: "",
            eggFeatures: [],
          },
          isInstalling: false,
        },
      }),
  },
}));
vi.mock("@/components/elements/ServerContentBlock", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));
vi.mock("@/components/elements/Can", () => ({ default: () => null }));
vi.mock("@/components/server/console/Console", () => ({ default: () => null }));
vi.mock("@/components/server/console/StatGraphs", () => ({
  default: () => null,
}));
vi.mock("@/components/server/console/ServerDetailsBlock", () => ({
  default: () => null,
}));
vi.mock("@feature/Features", () => ({ default: () => null }));
vi.mock("@blueprint/components/Server/Terminal/BeforeContent", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Server/Terminal/AfterContent", () => ({
  default: () => null,
}));

it("copies the full UUID rather than the route identifier and confirms success", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  const descriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  const portal = document.createElement("div");
  portal.id = "modal-portal";
  document.body.appendChild(portal);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  try {
    render(<ServerConsoleContainer />);
    const button = screen.getByRole("button", { name: "Copy server UUID" });
    expect(button.textContent).toBe(uuid);
    expect(button.getAttribute("type")).toBe("button");
    await act(async () => {
      fireEvent.click(button);
    });
    expect(writeText).toHaveBeenCalledWith(uuid);
    expect(screen.getByText("Copied text to clipboard.")).toBeDefined();
  } finally {
    cleanup();
    portal.remove();
    if (descriptor) Object.defineProperty(navigator, "clipboard", descriptor);
    else Reflect.deleteProperty(navigator, "clipboard");
  }
});
