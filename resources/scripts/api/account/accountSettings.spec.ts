import { describe, expect, it, vi } from "vitest";
import http from "@/api/http";
import updateAccountPassword from "./updateAccountPassword";
import updateAccountEmail from "./updateAccountEmail";
import updateAccountLanguage from "./updateAccountLanguage";
import updateAccountPrivacy from "./updateAccountPrivacy";
import {
  uploadAccountAvatar,
  removeAccountAvatar,
} from "./updateAccountAvatar";
import enableAccountTwoFactor from "./enableAccountTwoFactor";
import disableAccountTwoFactor from "./disableAccountTwoFactor";
import getTwoFactorTokenData from "./getTwoFactorTokenData";
import regenerateAccountRecoveryTokens from "./regenerateAccountRecoveryTokens";

vi.mock("@/api/http");

describe("api/account/accountSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateAccountPassword", () => {
    it("sends PUT request with current and new passwords", async () => {
      vi.mocked(http.put).mockResolvedValueOnce({} as any);

      await updateAccountPassword({
        current: "oldpass",
        password: "newpass",
        confirmPassword: "newpass",
      });

      expect(http.put).toHaveBeenCalledWith("/api/client/account/password", {
        current_password: "oldpass",
        password: "newpass",
        password_confirmation: "newpass",
      });
    });
  });

  describe("updateAccountEmail", () => {
    it("sends PUT request with email and password", async () => {
      vi.mocked(http.put).mockResolvedValueOnce({} as any);

      await updateAccountEmail("new@email.com", "pass123");

      expect(http.put).toHaveBeenCalledWith("/api/client/account/email", {
        email: "new@email.com",
        password: "pass123",
      });
    });
  });

  describe("updateAccountLanguage", () => {
    it("updates account language and returns response", async () => {
      vi.mocked(http.put).mockResolvedValueOnce({
        data: { language: "es", locale: "es-ES" },
      } as any);

      const result = await updateAccountLanguage("es");

      expect(http.put).toHaveBeenCalledWith("/api/client/account/language", {
        language: "es",
      });
      expect(result).toEqual({ language: "es", locale: "es-ES" });
    });
  });

  describe("updateAccountPrivacy", () => {
    it("updates privacy mode and returns boolean value", async () => {
      vi.mocked(http.put).mockResolvedValueOnce({
        data: { attributes: { blur_sensitive_data: true } },
      } as any);

      const result = await updateAccountPrivacy(true);

      expect(http.put).toHaveBeenCalledWith("/api/client/account/privacy", {
        blur_sensitive_data: true,
      });
      expect(result).toBe(true);
    });
  });

  describe("updateAccountAvatar", () => {
    it("uploads account avatar and returns url", async () => {
      vi.mocked(http.post).mockResolvedValueOnce({
        data: { attributes: { avatar_url: "https://example.com/avatar.png" } },
      } as any);

      const file = new File(["dummy"], "avatar.png", { type: "image/png" });
      const result = await uploadAccountAvatar(file);

      expect(http.post).toHaveBeenCalledWith(
        "/api/client/account/avatar",
        expect.any(FormData),
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      expect(result).toBe("https://example.com/avatar.png");
    });

    it("removes account avatar", async () => {
      vi.mocked(http.delete).mockResolvedValueOnce({} as any);

      await removeAccountAvatar();

      expect(http.delete).toHaveBeenCalledWith("/api/client/account/avatar");
    });
  });

  describe("two-factor authentication", () => {
    it("fetches two-factor token data", async () => {
      vi.mocked(http.get).mockResolvedValueOnce({
        data: {
          data: {
            image_url_data: "data:image/svg+xml;base64,123",
            secret: "SECRET123",
          },
        },
      } as any);

      const result = await getTwoFactorTokenData();

      expect(http.get).toHaveBeenCalledWith("/api/client/account/two-factor");
      expect(result).toEqual({
        image_url_data: "data:image/svg+xml;base64,123",
        secret: "SECRET123",
      });
    });

    it("enables two-factor auth and returns recovery tokens", async () => {
      vi.mocked(http.post).mockResolvedValueOnce({
        data: { attributes: { tokens: ["tok-1", "tok-2"] } },
      } as any);

      const tokens = await enableAccountTwoFactor("123456", "mypass");

      expect(http.post).toHaveBeenCalledWith("/api/client/account/two-factor", {
        code: "123456",
        password: "mypass",
      });
      expect(tokens).toEqual(["tok-1", "tok-2"]);
    });

    it("disables two-factor auth", async () => {
      vi.mocked(http.post).mockResolvedValueOnce({} as any);

      await disableAccountTwoFactor("mypass");

      expect(http.post).toHaveBeenCalledWith(
        "/api/client/account/two-factor/disable",
        { password: "mypass" },
      );
    });

    it("regenerates recovery tokens", async () => {
      vi.mocked(http.post).mockResolvedValueOnce({
        data: { attributes: { tokens: ["new-tok-1", "new-tok-2"] } },
      } as any);

      const tokens = await regenerateAccountRecoveryTokens("mypass");

      expect(http.post).toHaveBeenCalledWith(
        "/api/client/account/two-factor/regenerate-tokens",
        { password: "mypass" },
      );
      expect(tokens).toEqual(["new-tok-1", "new-tok-2"]);
    });
  });
});
