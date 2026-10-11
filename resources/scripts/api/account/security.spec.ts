import { describe, it, expect, vi, beforeEach } from "vitest";
import http from "@/api/http";
import {
  decodeBase64Url,
  encodeBase64Url,
  loginWithPasskey,
  registerPasskey,
  securityError,
} from "./security";

vi.mock("@/api/http", () => ({ default: { get: vi.fn(), post: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(http.get).mockResolvedValue({ data: {} });
});

describe("passkey browser transport", () => {
  it("round trips binary values without losing high bytes or padding", () => {
    const value = Uint8Array.from([0, 127, 128, 254, 255]).buffer;
    const encoded = encodeBase64Url(value);
    expect(encoded).not.toMatch(/[+/=]/);
    expect(new Uint8Array(decodeBase64Url(encoded))).toEqual(
      new Uint8Array(value),
    );
  });

  it("sends a signed assertion and returns the existing TOTP checkpoint", async () => {
    const binary = Uint8Array.from([1, 2, 3]).buffer;
    const getCredential = vi.fn().mockResolvedValue({
      rawId: binary,
      response: {
        clientDataJSON: binary,
        authenticatorData: binary,
        signature: binary,
        userHandle: binary,
      },
    });
    Object.defineProperty(navigator, "credentials", {
      configurable: true,
      value: { get: getCredential },
    });
    vi.mocked(http.post)
      .mockResolvedValueOnce({
        data: {
          publicKey: {
            challenge: "AQID",
            rpId: "localhost",
            userVerification: "required",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: { complete: false, confirmation_token: "checkpoint-token" },
        },
      });
    expect(await loginWithPasskey()).toEqual({
      complete: false,
      intended: undefined,
      confirmationToken: "checkpoint-token",
    });
    expect(getCredential).toHaveBeenCalledWith({
      publicKey: expect.objectContaining({
        challenge: binary,
        userVerification: "required",
      }),
    });
    expect(http.post).toHaveBeenLastCalledWith("/auth/passkeys/login", {
      id: "AQID",
      response: {
        clientDataJSON: "AQID",
        authenticatorData: "AQID",
        signature: "AQID",
        userHandle: "AQID",
      },
    });
  });

  it("decodes registration exclusions and sends attestation and transports", async () => {
    const binary = Uint8Array.from([1, 2, 3]).buffer;
    const createCredential = vi.fn().mockResolvedValue({
      rawId: binary,
      response: {
        clientDataJSON: binary,
        attestationObject: binary,
        getTransports: () => ["internal"],
      },
    });
    Object.defineProperty(navigator, "credentials", {
      configurable: true,
      value: { create: createCredential },
    });
    vi.mocked(http.post)
      .mockResolvedValueOnce({
        data: {
          publicKey: {
            challenge: "AQID",
            user: { id: "AQID", name: "user" },
            excludeCredentials: [{ id: "AQID", type: "public-key" }],
          },
        },
      })
      .mockResolvedValueOnce({});
    await registerPasskey("My phone", "password-proof");
    expect(createCredential).toHaveBeenCalledWith({
      publicKey: expect.objectContaining({
        user: { id: binary, name: "user" },
        excludeCredentials: [{ id: binary, type: "public-key" }],
      }),
    });
    expect(http.post).toHaveBeenLastCalledWith("/account/security/passkeys", {
      name: "My phone",
      id: "AQID",
      response: {
        clientDataJSON: "AQID",
        attestationObject: "AQID",
        transports: ["internal"],
      },
    });
  });

  it("does not submit a credential if the user cancels", async () => {
    Object.defineProperty(navigator, "credentials", {
      configurable: true,
      value: { get: vi.fn().mockResolvedValue(null) },
    });
    vi.mocked(http.post).mockResolvedValue({
      data: { publicKey: { challenge: "AQID" } },
    });
    await expect(loginWithPasskey()).rejects.toThrow("No passkey was selected");
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it("explains cancelled browser ceremonies", () => {
    expect(securityError(new DOMException("", "NotAllowedError"))).toEqual(
      new Error(
        "The passkey request was cancelled or timed out. Please try again.",
      ),
    );
  });
});
