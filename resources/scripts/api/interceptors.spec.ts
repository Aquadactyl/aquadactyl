import { describe, expect, it, vi } from "vitest";
import http from "@/api/http";
import { setupInterceptors } from "./interceptors";
import { AxiosError } from "axios";

describe("api/interceptors", () => {
  it("registers response interceptor and handles TwoFactorAuthRequiredException", () => {
    let errorHandler: ((error: any) => any) | undefined;
    let successHandler: ((resp: any) => any) | undefined;

    vi.spyOn(http.interceptors.response, "use").mockImplementation(
      (onSuccess: any, onError: any) => {
        successHandler = onSuccess;
        errorHandler = onError;
        return 1;
      },
    );

    const mockHistory = {
      replace: vi.fn(),
    };

    setupInterceptors(mockHistory as any);

    expect(successHandler).toBeDefined();
    expect(errorHandler).toBeDefined();

    // Success pass-through
    const dummyResp = { data: "ok" };
    expect(successHandler!(dummyResp)).toBe(dummyResp);

    // Error with status 400 and TwoFactorAuthRequiredException
    const twoFactorError = {
      response: {
        status: 400,
        data: {
          errors: [{ code: "TwoFactorAuthRequiredException" }],
        },
      },
    } as AxiosError;

    expect(() => errorHandler!(twoFactorError)).toThrow(twoFactorError as any);
    expect(mockHistory.replace).toHaveBeenCalledWith("/account", {
      twoFactorRedirect: true,
    });
  });

  it("passes non-400 or other errors through without redirect", () => {
    let errorHandler: ((error: any) => any) | undefined;

    vi.spyOn(http.interceptors.response, "use").mockImplementation(
      (_onSuccess: any, onError: any) => {
        errorHandler = onError;
        return 1;
      },
    );

    const mockHistory = {
      replace: vi.fn(),
    };

    setupInterceptors(mockHistory as any);

    const notFoundError = {
      response: {
        status: 404,
        data: { errors: [{ code: "NotFound" }] },
      },
    } as AxiosError;

    expect(() => errorHandler!(notFoundError)).toThrow(notFoundError as any);
    expect(mockHistory.replace).not.toHaveBeenCalled();
  });
});
