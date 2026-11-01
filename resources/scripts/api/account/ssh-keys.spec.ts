import { describe, expect, it, vi, beforeEach } from "vitest";
import http from "@/api/http";
import { createSSHKey, deleteSSHKey, useSSHKeys } from "./ssh-keys";

vi.mock("@/api/http");

let capturedQueryFn: (() => Promise<any>) | null = null;
vi.mock("@/lib/queryClient", () => ({
  useTanStackQuery: (_key: any, queryFn: () => Promise<any>, _config: any) => {
    capturedQueryFn = queryFn;
    return { data: undefined, error: null };
  },
}));

vi.mock("@/plugins/useQueryKey", () => ({
  useUserQueryKey: (key: any) => key,
}));

describe("api/account/ssh-keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedQueryFn = null;
  });

  it("createSSHKey posts key data and returns transformed model", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({
      data: {
        attributes: {
          name: "My Key",
          public_key: "ssh-ed25519 AAAA...",
          fingerprint: "SHA256:1234",
          created_at: "2026-01-01T00:00:00Z",
        },
      },
    } as any);

    const result = await createSSHKey("My Key", "ssh-ed25519 AAAA...");
    expect(http.post).toHaveBeenCalledWith("/api/client/account/ssh-keys", {
      name: "My Key",
      public_key: "ssh-ed25519 AAAA...",
    });
    expect(result.name).toBe("My Key");
    expect(result.fingerprint).toBe("SHA256:1234");
  });

  it("deleteSSHKey sends fingerprint to remove endpoint", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({} as any);

    await deleteSSHKey("SHA256:1234");
    expect(http.post).toHaveBeenCalledWith(
      "/api/client/account/ssh-keys/remove",
      {
        fingerprint: "SHA256:1234",
      },
    );
  });

  it("useSSHKeys invokes query function and transforms results", async () => {
    useSSHKeys({ enabled: true });

    expect(capturedQueryFn).not.toBeNull();

    vi.mocked(http.get).mockResolvedValueOnce({
      data: {
        data: [
          {
            attributes: {
              name: "Key 1",
              public_key: "ssh-rsa AAAA...",
              fingerprint: "SHA256:abcd",
              created_at: "2026-01-01T00:00:00Z",
            },
          },
        ],
      },
    } as any);

    const keys = await capturedQueryFn!();
    expect(http.get).toHaveBeenCalledWith("/api/client/account/ssh-keys");
    expect(keys).toHaveLength(1);
    expect(keys[0].name).toBe("Key 1");
    expect(keys[0].fingerprint).toBe("SHA256:abcd");
  });
});
