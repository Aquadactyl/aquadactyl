import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SubdomainBox from "./SubdomainBox";
import http from "@/api/http";

vi.mock("@/api/http", () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  httpErrorToHuman: () => "Request failed",
}));
vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({ server: { data: { uuid: "test-server" } } }),
  },
}));
vi.mock("@/plugins/usePanelTranslation", () => ({
  default: () => ({ t: (_key: string, fallback: string) => fallback }),
}));
vi.mock("@/components/elements/TitledGreyBox", () => ({
  default: ({ title, children }: any) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));
vi.mock("@/components/elements/Select", () => ({
  default: (props: any) => <select {...props} />,
}));
vi.mock("@/components/elements/CopyOnClick", () => ({
  default: ({ children, text }: any) => <div data-copy={text}>{children}</div>,
}));

const domains = [
  { id: 1, domain: "play.example.com" },
  { id: 2, domain: "games.example.com" },
];
const endpoint = "/api/client/servers/test-server/settings/subdomain";
const mount = (subdomain: any = null, options = domains) => {
  vi.mocked(http.get).mockResolvedValue({
    data: { domains: options, subdomain },
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SubdomainBox />
    </QueryClientProvider>,
  );
};
beforeEach(() => vi.clearAllMocks());

it("hides the controls while loading and when no domain is enabled", async () => {
  const view = mount(null, []);
  expect(view.container.textContent).toBe("");
  await waitFor(() => expect(http.get).toHaveBeenCalledWith(endpoint));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 15));
  });
  expect(view.container.textContent).toBe("");
});

it("creates an address in the default domain and refreshes the queued state", async () => {
  mount();
  fireEvent.change(await screen.findByLabelText("Name"), {
    target: { value: "MY-SERVER" },
  });
  expect(screen.getByLabelText("Name")).toHaveProperty("value", "my-server");
  vi.mocked(http.get).mockResolvedValue({
    data: {
      domains,
      subdomain: {
        hostname: "my-server.play.example.com",
        status: "pending",
        minecraft_srv: false,
        port: 25570,
      },
    },
  });
  fireEvent.submit(screen.getByLabelText("Name").closest("form")!);
  await waitFor(() =>
    expect(http.post).toHaveBeenCalledWith(endpoint, {
      domain_id: 1,
      label: "my-server",
      minecraft_srv: false,
    }),
  );
  expect(
    await screen.findByDisplayValue("my-server.play.example.com:25570"),
  ).toBeDefined();
  expect(screen.getByRole("status").textContent).toBe("pending");
});

it("supports choosing another domain and Minecraft SRV records", async () => {
  mount();
  fireEvent.change(await screen.findByLabelText("Name"), {
    target: { value: "minecraft" },
  });
  fireEvent.change(screen.getByLabelText("Domain"), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("checkbox"));
  let finish!: (value: any) => void;
  vi.mocked(http.post).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  fireEvent.submit(screen.getByLabelText("Name").closest("form")!);
  expect(
    screen.getByRole("button", { name: "Create subdomain" }),
  ).toHaveProperty("disabled", true);
  expect(http.post).toHaveBeenCalledWith(endpoint, {
    domain_id: 2,
    label: "minecraft",
    minecraft_srv: true,
  });
  vi.mocked(http.get).mockResolvedValue({
    data: {
      domains,
      subdomain: {
        hostname: "minecraft.games.example.com",
        status: "active",
        minecraft_srv: true,
        port: 25565,
      },
    },
  });
  await act(async () => finish({}));
  expect(
    await screen.findByDisplayValue("minecraft.games.example.com"),
  ).toBeDefined();
});

it("shows create failures and re-enables the form", async () => {
  mount();
  fireEvent.change(await screen.findByLabelText("Name"), {
    target: { value: "taken" },
  });
  vi.mocked(http.post).mockRejectedValue(new Error("conflict"));
  fireEvent.submit(screen.getByLabelText("Name").closest("form")!);
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "Request failed",
  );
  expect(
    screen.getByRole("button", { name: "Create subdomain" }),
  ).toHaveProperty("disabled", false);
});

it("explains DNS failures and allows removal to be retried", async () => {
  mount({
    hostname: "test.play.example.com",
    status: "error",
    minecraft_srv: false,
    port: 19132,
  });
  expect(await screen.findByText(/DNS setup failed/)).toBeDefined();
  vi.mocked(http.delete).mockRejectedValueOnce(new Error("unavailable"));
  fireEvent.click(screen.getByRole("button", { name: "Remove subdomain" }));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "Request failed",
  );
  vi.mocked(http.delete).mockResolvedValue({});
  vi.mocked(http.get).mockResolvedValue({ data: { domains, subdomain: null } });
  fireEvent.click(screen.getByRole("button", { name: "Remove subdomain" }));
  expect(await screen.findByLabelText("Name")).toBeDefined();
  expect(http.delete).toHaveBeenCalledWith(endpoint);
});

it("prevents duplicate deletion requests while DNS cleanup is pending", async () => {
  mount({
    hostname: "test.play.example.com",
    status: "deleting",
    minecraft_srv: false,
    port: 25565,
  });
  expect(
    await screen.findByRole("button", { name: "Remove subdomain" }),
  ).toHaveProperty("disabled", true);
});
