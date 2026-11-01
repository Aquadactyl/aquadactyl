import http from "@/api/http";
import type { LoginResponse } from "@/api/auth/login";

export interface SignInProvider {
  id: string;
  label: string;
}
export interface SignInMethods {
  passkeys_enabled: boolean;
  providers: SignInProvider[];
  confirmation_token?: string | null;
  error?: string | null;
}
export interface AccountSecurity extends SignInMethods {
  passkeys: {
    id: number;
    name: string;
    created_at: string;
    last_used_at: string | null;
  }[];
  identities: {
    id: number;
    provider: string;
    display_name: string | null;
    created_at: string;
    last_used_at: string | null;
  }[];
  notice?: string | null;
}

export const passkeysSupported = (): boolean =>
  window.isSecureContext &&
  !!window.PublicKeyCredential &&
  !!navigator.credentials;

export const decodeBase64Url = (value: string): ArrayBuffer => {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer;
};

export const encodeBase64Url = (value: ArrayBuffer): string => {
  const bytes = new Uint8Array(value);
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

export const securityError = (error: unknown): unknown => {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "AbortError") {
      return new Error(
        "The passkey request was cancelled or timed out. Please try again.",
      );
    }
    if (error.name === "InvalidStateError")
      return new Error("This passkey is already registered.");
    if (error.name === "SecurityError")
      return new Error(
        "Passkeys require HTTPS and the configured panel address.",
      );
  }
  return error;
};

export const getSignInMethods = async (): Promise<SignInMethods> =>
  (await http.get(`/auth/methods${window.location.search}`)).data;
export const getAccountSecurity = async (): Promise<AccountSecurity> =>
  (await http.get("/account/security")).data;

export const loginWithPasskey = async (): Promise<LoginResponse> => {
  await http.get("/sanctum/csrf-cookie");
  const { data } = await http.post("/auth/passkeys/options");
  const publicKey: PublicKeyCredentialRequestOptions = {
    ...data.publicKey,
    challenge: decodeBase64Url(data.publicKey.challenge),
    allowCredentials: (data.publicKey.allowCredentials || []).map(
      (key: { id: string; type: string }) => ({
        ...key,
        id: decodeBase64Url(key.id),
      }),
    ),
  };
  const credential = (await navigator.credentials.get({
    publicKey,
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("No passkey was selected.");
  const response = credential.response as AuthenticatorAssertionResponse;
  if (!response.userHandle)
    throw new Error(
      "Choose a discoverable passkey registered with this panel.",
    );
  const result = await http.post("/auth/passkeys/login", {
    id: encodeBase64Url(credential.rawId),
    response: {
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      authenticatorData: encodeBase64Url(response.authenticatorData),
      signature: encodeBase64Url(response.signature),
      userHandle: encodeBase64Url(response.userHandle),
    },
  });
  return {
    complete: result.data.data.complete,
    intended: result.data.data.intended,
    confirmationToken: result.data.data.confirmation_token,
  };
};

export const registerPasskey = async (
  name: string,
  password: string,
): Promise<void> => {
  await http.get("/sanctum/csrf-cookie");
  const { data } = await http.post("/account/security/passkeys/options", {
    current_password: password,
  });
  const publicKey: PublicKeyCredentialCreationOptions = {
    ...data.publicKey,
    challenge: decodeBase64Url(data.publicKey.challenge),
    user: {
      ...data.publicKey.user,
      id: decodeBase64Url(data.publicKey.user.id),
    },
    excludeCredentials: (data.publicKey.excludeCredentials || []).map(
      (key: { id: string; type: string }) => ({
        ...key,
        id: decodeBase64Url(key.id),
      }),
    ),
  };
  const credential = (await navigator.credentials.create({
    publicKey,
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("No passkey was created.");
  const response = credential.response as AuthenticatorAttestationResponse;
  await http.post("/account/security/passkeys", {
    name,
    id: encodeBase64Url(credential.rawId),
    response: {
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      attestationObject: encodeBase64Url(response.attestationObject),
      transports: response.getTransports?.() || [],
    },
  });
};

export const removeSignInMethod = async (
  type: "passkeys" | "oauth",
  id: number,
  password: string,
): Promise<void> => {
  await http.get("/sanctum/csrf-cookie");
  await http.delete(`/account/security/${type}/${id}`, {
    data: { current_password: password },
  });
};

export const linkOAuthProvider = async (
  id: string,
  password: string,
): Promise<void> => {
  await http.get("/sanctum/csrf-cookie");
  const { data } = await http.post(`/account/security/oauth/${id}`, {
    current_password: password,
  });
  window.location.assign(data.redirect);
};
