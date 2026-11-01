import { render } from "@testing-library/react";
import React, { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import features from "./index";

vi.mock("@feature/eula/EulaModalFeature", () => ({
  default: () => <div data-testid="eula" />,
}));
vi.mock("@feature/JavaVersionModalFeature", () => ({
  default: () => <div data-testid="java_version" />,
}));
vi.mock("@feature/GSLTokenModalFeature", () => ({
  default: () => <div data-testid="gsl_token" />,
}));
vi.mock("@feature/PIDLimitModalFeature", () => ({
  default: () => <div data-testid="pid_limit" />,
}));
vi.mock("@feature/SteamDiskSpaceFeature", () => ({
  default: () => <div data-testid="steam_disk_space" />,
}));
vi.mock("@feature/HytaleOauthRequireFeature", () => ({
  default: () => <div data-testid="hytale_oauth" />,
}));

describe("components/server/features/index", () => {
  it("registers and loads all lazy feature components", async () => {
    for (const [key, Component] of Object.entries(features)) {
      const { findByTestId } = render(
        <Suspense fallback={<div>loading</div>}>
          <Component />
        </Suspense>,
      );
      expect(await findByTestId(key)).toBeDefined();
    }
  });
});
