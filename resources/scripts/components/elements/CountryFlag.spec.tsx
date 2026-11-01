import React from "react";
import { render, cleanup } from "@testing-library/react";
import CountryFlag from "./CountryFlag";
import { describe, expect, it, afterEach } from "vitest";

describe("CountryFlag", () => {
  afterEach(cleanup);

  it("returns null if code is missing, null, or invalid format", () => {
    const { container: c1 } = render(<CountryFlag />);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(<CountryFlag code={null} />);
    expect(c2.firstChild).toBeNull();

    const { container: c3 } = render(<CountryFlag code="USA" />);
    expect(c3.firstChild).toBeNull();

    const { container: c4 } = render(<CountryFlag code="us" />);
    expect(c4.firstChild).toBeNull();
  });

  it("renders flag image with code and name", () => {
    const { container } = render(
      <CountryFlag code="US" name="United States" />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("/flags/us.svg");
    expect(img?.getAttribute("alt")).toBe("United States");
    expect(img?.getAttribute("title")).toBe("United States");
  });

  it("renders flag image falling back to code when name is omitted or empty", () => {
    const { container } = render(<CountryFlag code="FR" />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("/flags/fr.svg");
    expect(img?.getAttribute("alt")).toBe("FR");
    expect(img?.getAttribute("title")).toBe("FR");
  });
});
