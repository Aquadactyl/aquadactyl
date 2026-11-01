import { describe, expect, it, vi } from "vitest";
import getServerStartup from "./getServerStartup";
import http from "@/api/http";

vi.mock("@/api/http");
vi.mock("@/lib/queryClient", () => ({
  useTanStackQuery: (_key: any, fn: any, opts: any) => ({
    queryKey: _key,
    queryFn: fn,
    options: opts,
  }),
}));

describe("api/server/startup/getServerStartup", () => {
  it("fetches server startup data with complete payload", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: {
        data: [
          {
            object: "egg_variable",
            attributes: {
              name: "Server Port",
              description: "The port to bind",
              env_variable: "SERVER_PORT",
              default_value: "25565",
              server_value: "25565",
              is_editable: true,
              rules: "required|numeric",
            },
          },
        ],
        meta: {
          startup_command: "java -jar server.jar",
          docker_images: { "ghcr.io/pterodactyl/java:17": "Java 17" },
        },
      },
    } as any);

    const query = getServerStartup("srv-1", null, { enabled: true }) as any;
    expect(query.queryKey).toEqual(["srv-1", "/startup"]);
    expect(query.options.initialData).toBeUndefined();
    expect(query.options.enabled).toBe(true);

    const res = await (query as any).queryFn();
    expect(http.get).toHaveBeenCalledWith("/api/client/servers/srv-1/startup");
    expect(res.invocation).toBe("java -jar server.jar");
    expect(res.variables.length).toBe(1);
    expect(res.dockerImages).toEqual({
      "ghcr.io/pterodactyl/java:17": "Java 17",
    });
  });

  it("handles empty data and missing docker_images with initialData passed", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: {
        data: null,
        meta: {
          startup_command: "./run.sh",
          docker_images: null,
        },
      },
    } as any);

    const initialData = {
      invocation: "./init.sh",
      variables: [],
      dockerImages: {},
    };

    const query = getServerStartup("srv-2", initialData) as any;
    expect(query.options.initialData).toBe(initialData);

    const res = await (query as any).queryFn();
    expect(res.invocation).toBe("./run.sh");
    expect(res.variables).toEqual([]);
    expect(res.dockerImages).toEqual({});
  });
});
