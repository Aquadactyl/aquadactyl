import { describe, expect, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import PrivacyMode from "./PrivacyMode";

let mockPrivacyMode = false;

vi.mock("@/plugins/usePrivacyMode", () => ({
  default: () => mockPrivacyMode,
}));

describe("components/elements/PrivacyMode", () => {
  beforeEach(() => {
    document.documentElement.className = "";
  });

  it("adds privacy-mode class when enabled", () => {
    mockPrivacyMode = true;
    render(<PrivacyMode />);
    expect(document.documentElement.classList.contains("privacy-mode")).toBe(
      true,
    );
  });

  it("removes privacy-mode class when disabled", () => {
    document.documentElement.classList.add("privacy-mode");
    mockPrivacyMode = false;
    render(<PrivacyMode />);
    expect(document.documentElement.classList.contains("privacy-mode")).toBe(
      false,
    );
  });
});
