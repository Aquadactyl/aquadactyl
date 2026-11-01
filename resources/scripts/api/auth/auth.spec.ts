import { describe, expect, it, vi } from "vitest";
import http from "@/api/http";
import login from "./login";
import register from "./register";
import loginCheckpoint from "./loginCheckpoint";
import requestPasswordResetEmail from "./requestPasswordResetEmail";
import performPasswordReset from "./performPasswordReset";

vi.mock("@/api/http");

describe("api/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("login", () => {
    it("completes login request successfully", async () => {
      vi.mocked(http.get).mockResolvedValueOnce({} as any);
      vi.mocked(http.post).mockResolvedValueOnce({
        data: {
          data: {
            complete: true,
            intended: "/server/123",
          },
        },
      } as any);

      const result = await login({
        username: "testuser",
        password: "secretpassword",
        recaptchaData: "token123",
      });

      expect(http.get).toHaveBeenCalledWith("/sanctum/csrf-cookie");
      expect(http.post).toHaveBeenCalledWith("/auth/login", {
        user: "testuser",
        password: "secretpassword",
        "g-recaptcha-response": "token123",
      });
      expect(result).toEqual({
        complete: true,
        intended: "/server/123",
        confirmationToken: undefined,
      });
    });

    it("handles two-factor confirmation token requirement", async () => {
      vi.mocked(http.get).mockResolvedValueOnce({} as any);
      vi.mocked(http.post).mockResolvedValueOnce({
        data: {
          data: {
            complete: false,
            confirmation_token: "confirm-token-abc",
          },
        },
      } as any);

      const result = await login({
        username: "testuser",
        password: "secretpassword",
      });

      expect(result).toEqual({
        complete: false,
        intended: undefined,
        confirmationToken: "confirm-token-abc",
      });
    });

    it("rejects when response data is not an object", async () => {
      vi.mocked(http.get).mockResolvedValueOnce({} as any);
      vi.mocked(http.post).mockResolvedValueOnce({
        data: "invalid response",
      } as any);

      await expect(
        login({ username: "user", password: "pass" }),
      ).rejects.toThrow(
        "An error occurred while processing the login request.",
      );
    });
  });

  describe("register", () => {
    it("completes registration request successfully", async () => {
      vi.mocked(http.get).mockResolvedValueOnce({} as any);
      vi.mocked(http.post).mockResolvedValueOnce({
        data: {
          data: {
            complete: true,
            intended: "/account",
          },
        },
      } as any);

      const result = await register({
        username: "newuser",
        email: "new@example.com",
        name_first: "New",
        name_last: "User",
        password: "Password123!",
        password_confirmation: "Password123!",
        recaptchaData: null,
      });

      expect(http.get).toHaveBeenCalledWith("/sanctum/csrf-cookie");
      expect(http.post).toHaveBeenCalledWith("/auth/register", {
        username: "newuser",
        email: "new@example.com",
        name_first: "New",
        name_last: "User",
        password: "Password123!",
        password_confirmation: "Password123!",
        "g-recaptcha-response": null,
      });
      expect(result).toEqual({
        complete: true,
        intended: "/account",
      });
    });

    it("rejects when registration response is not an object", async () => {
      vi.mocked(http.get).mockResolvedValueOnce({} as any);
      vi.mocked(http.post).mockResolvedValueOnce({
        data: null,
      } as any);

      await expect(
        register({
          username: "newuser",
          email: "new@example.com",
          name_first: "New",
          name_last: "User",
          password: "pass",
          password_confirmation: "pass",
        }),
      ).rejects.toThrow(
        "An error occurred while processing the registration request.",
      );
    });

    it("handles undefined intended in registration response", async () => {
      vi.mocked(http.get).mockResolvedValueOnce({} as any);
      vi.mocked(http.post).mockResolvedValueOnce({
        data: {
          data: {
            complete: true,
            intended: "",
          },
        },
      } as any);

      const result = await register({
        username: "user2",
        email: "user2@test.com",
        name_first: "U",
        name_last: "2",
        password: "pass",
        password_confirmation: "pass",
      });

      expect(result.intended).toBeUndefined();
    });

    it("rejects when csrf cookie fetch fails", async () => {
      vi.mocked(http.get).mockRejectedValueOnce(new Error("CSRF failed"));

      await expect(
        register({
          username: "user3",
          email: "user3@test.com",
          name_first: "U",
          name_last: "3",
          password: "pass",
          password_confirmation: "pass",
        }),
      ).rejects.toThrow("CSRF failed");
    });
  });

  describe("loginCheckpoint", () => {
    it("submits 2fa checkpoint code and returns login result", async () => {
      vi.mocked(http.post).mockResolvedValueOnce({
        data: {
          data: {
            complete: true,
            intended: "/",
          },
        },
      } as any);

      const result = await loginCheckpoint("token-123", "654321");
      expect(http.post).toHaveBeenCalledWith("/auth/login/checkpoint", {
        confirmation_token: "token-123",
        authentication_code: "654321",
        recovery_token: undefined,
      });
      expect(result).toEqual({
        complete: true,
        intended: "/",
      });
    });

    it("submits recovery token when provided", async () => {
      vi.mocked(http.post).mockResolvedValueOnce({
        data: {
          data: {
            complete: true,
          },
        },
      } as any);

      const result = await loginCheckpoint(
        "token-123",
        "",
        "recovery-backup-code",
      );
      expect(http.post).toHaveBeenCalledWith("/auth/login/checkpoint", {
        confirmation_token: "token-123",
        authentication_code: "",
        recovery_token: "recovery-backup-code",
      });
      expect(result.complete).toBe(true);
    });
  });

  describe("requestPasswordResetEmail", () => {
    it("requests password reset email with status string response", async () => {
      vi.mocked(http.post).mockResolvedValueOnce({
        data: { status: "We have emailed your password reset link!" },
      } as any);

      const result = await requestPasswordResetEmail("user@test.com", "recap");
      expect(http.post).toHaveBeenCalledWith("/auth/password", {
        email: "user@test.com",
        "g-recaptcha-response": "recap",
      });
      expect(result).toBe("We have emailed your password reset link!");
    });

    it("falls back to empty string when status is not present", async () => {
      vi.mocked(http.post).mockResolvedValueOnce({
        data: {},
      } as any);

      const result = await requestPasswordResetEmail("user@test.com");
      expect(result).toBe("");
    });

    it("rejects when reset email request fails", async () => {
      vi.mocked(http.post).mockRejectedValueOnce(new Error("Rate limited"));
      await expect(requestPasswordResetEmail("user@test.com")).rejects.toThrow(
        "Rate limited",
      );
    });
  });

  describe("performPasswordReset", () => {
    it("performs password reset and returns redirect details", async () => {
      vi.mocked(http.post).mockResolvedValueOnce({
        data: {
          redirect_to: "/auth/login",
          send_to_login: true,
        },
      } as any);

      const result = await performPasswordReset("user@test.com", {
        token: "reset-tok-xyz",
        password: "NewPassword123!",
        passwordConfirmation: "NewPassword123!",
      });

      expect(http.post).toHaveBeenCalledWith("/auth/password/reset", {
        email: "user@test.com",
        token: "reset-tok-xyz",
        password: "NewPassword123!",
        password_confirmation: "NewPassword123!",
      });
      expect(result).toEqual({
        redirectTo: "/auth/login",
        sendToLogin: true,
      });
    });

    it("rejects when reset fails", async () => {
      vi.mocked(http.post).mockRejectedValueOnce(new Error("Invalid token"));
      await expect(
        performPasswordReset("user@test.com", {
          token: "bad",
          password: "pass",
          passwordConfirmation: "pass",
        }),
      ).rejects.toThrow("Invalid token");
    });
  });
});
