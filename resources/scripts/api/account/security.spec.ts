import { describe, it, expect, vi, beforeEach } from "vitest";
import http from "@/api/http";
import {
  decodeBase64Url,
  encodeBase64Url,
  getAccountSecurity,
  getSignInMethods,
  linkOAuthProvider,
  loginWithPasskey,
  passkeysSupported,
  registerPasskey,
  removeSignInMethod,
  securityError,
} from "./security";

vi.mock("@/api/http", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(http.get).mockResolvedValue({ data: {} });
  vi.mocked(http.post).mockResolvedValue({ data: {} });
  vi.mocked(http.delete).mockResolvedValue({ data: {} });
});

describe("passkey browser transport", () => {
  it("checks passkeysSupported correctly", () => {
    (window as any).isSecureContext = true;
    (window as any).PublicKeyCredential = class {};
    Object.defineProperty(navigator, "credentials", {
      configurable: true,
      value: {},
    });
    expect(passkeysSupported()).toBe(true);

    (window as any).isSecureContext = false;
    expect(passkeysSupported()).toBe(false);
  });

  it("round trips binary values without losing high bytes or padding", () => {
    const value = Uint8Array.from([0, 127, 128, 254, 255]).buffer;
    const encoded = encodeBase64Url(value);
    expect(encoded).not.toMatch(/[+/=]/);
    expect(new Uint8Array(decodeBase64Url(encoded))).toEqual(
      new Uint8Array(value),
    );
  });

  it("fetches sign-in methods and account security", async () => {
    vi.mocked(http.get)
      .mockResolvedValueOnce({
        data: { passkeys_enabled: true, providers: [] },
      } as any)
      .mockResolvedValueOnce({ data: { passkeys: [], identities: [] } } as any);

    const methods = await getSignInMethods();
    expect(methods.passkeys_enabled).toBe(true);

    const sec = await getAccountSecurity();
    expect(sec.passkeys).toEqual([]);
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
            allowCredentials: [{ id: "AQID", type: "public-key" }],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            complete: false,
            confirmation_token: "checkpoint-token",
            intended: "/servers",
          },
        },
      });
    expect(await loginWithPasskey()).toEqual({
      complete: false,
      intended: "/servers",
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

  it("throws error when credential has no userHandle during loginWithPasskey", async () => {
    const binary = Uint8Array.from([1, 2, 3]).buffer;
    Object.defineProperty(navigator, "credentials", {
      configurable: true,
      value: {
        get: vi.fn().mockResolvedValue({
          rawId: binary,
          response: {
            clientDataJSON: binary,
            authenticatorData: binary,
            signature: binary,
            userHandle: null,
          },
        }),
      },
    });
    vi.mocked(http.post).mockResolvedValueOnce({
      data: {
        publicKey: {
          challenge: "AQID",
        },
      },
    });

    await expect(loginWithPasskey()).rejects.toThrow(
      "Choose a discoverable passkey registered with this panel.",
    );
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

  it("handles registerPasskey when user cancels or getTransports is missing", async () => {
    Object.defineProperty(navigator, "credentials", {
      configurable: true,
      value: { create: vi.fn().mockResolvedValue(null) },
    });
    vi.mocked(http.post).mockResolvedValueOnce({
      data: {
        publicKey: {
          challenge: "AQID",
          user: { id: "AQID" },
        },
      },
    });

    await expect(registerPasskey("Key", "pwd")).rejects.toThrow(
      "No passkey was created.",
    );

    // With credential but without getTransports
    const binary = Uint8Array.from([1, 2, 3]).buffer;
    Object.defineProperty(navigator, "credentials", {
      configurable: true,
      value: {
        create: vi.fn().mockResolvedValue({
          rawId: binary,
          response: {
            clientDataJSON: binary,
            attestationObject: binary,
          },
        }),
      },
    });
    vi.mocked(http.post)
      .mockResolvedValueOnce({
        data: {
          publicKey: {
            challenge: "AQID",
            user: { id: "AQID" },
          },
        },
      })
      .mockResolvedValueOnce({});

    await registerPasskey("Key 2", "pwd");
    expect(http.post).toHaveBeenLastCalledWith("/account/security/passkeys", {
      name: "Key 2",
      id: "AQID",
      response: {
        clientDataJSON: "AQID",
        attestationObject: "AQID",
        transports: [],
      },
    });
  });

  it("removes sign-in method and links oauth provider", async () => {
    await removeSignInMethod("passkeys", 42, "current-pw");
    expect(http.get).toHaveBeenCalledWith("/sanctum/csrf-cookie");
    expect(http.delete).toHaveBeenCalledWith("/account/security/passkeys/42", {
      data: { current_password: "current-pw" },
    });

    const assignMock = vi.fn();
    window.location.assign = assignMock;
    vi.mocked(http.post).mockResolvedValueOnce({
      data: { redirect: "https://auth.example.com/oauth" },
    });

    await linkOAuthProvider("discord", "current-pw");
    expect(http.post).toHaveBeenCalledWith("/account/security/oauth/discord", {
      current_password: "current-pw",
    });
    expect(assignMock).toHaveBeenCalledWith("https://auth.example.com/oauth");
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

  it("explains cancelled browser ceremonies and handles all securityError cases", () => {
    expect(securityError(new DOMException("", "NotAllowedError"))).toEqual(
      new Error(
        "The passkey request was cancelled or timed out. Please try again.",
      ),
    );
    expect(securityError(new DOMException("", "AbortError"))).toEqual(
      new Error(
        "The passkey request was cancelled or timed out. Please try again.",
      ),
    );
    expect(securityError(new DOMException("", "InvalidStateError"))).toEqual(
      new Error("This passkey is already registered."),
    );
    expect(securityError(new DOMException("", "SecurityError"))).toEqual(
      new Error("Passkeys require HTTPS and the configured panel address."),
    );
    const unknownDomError = new DOMException("", "TimeoutError");
    expect(securityError(unknownDomError)).toBe(unknownDomError);

    const normalError = new Error("Regular failure");
    expect(securityError(normalError)).toBe(normalError);
  });
});
