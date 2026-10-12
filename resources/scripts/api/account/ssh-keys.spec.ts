import { describe, expect, it, vi } from "vitest";
import http from "@/api/http";
import { createSSHKey, deleteSSHKey } from "./ssh-keys";

vi.mock("@/api/http");

describe("api/account/ssh-keys", () => {
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
});
