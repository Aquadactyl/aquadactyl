import React from "react";
import { render, cleanup } from "@testing-library/react";
import TitledGreyBox from "./TitledGreyBox";
import GreyRowBox from "./GreyRowBox";
import ContentContainer from "./ContentContainer";

describe("Layout and Box components", () => {
  afterEach(cleanup);

  it("TitledGreyBox renders header with title string, icon, and body children", () => {
    const DummyIcon = ({ className }: { className?: string }) => (
      <svg data-testid="box-icon" className={className} />
    );

    const { getByText, getByTestId } = render(
      <TitledGreyBox title="Server Configuration" icon={DummyIcon}>
        <p>Configuration details</p>
      </TitledGreyBox>,
    );

    expect(getByText("Server Configuration")).toBeDefined();
    expect(getByTestId("box-icon")).toBeDefined();
    expect(getByText("Configuration details")).toBeDefined();
  });

  it("TitledGreyBox supports ReactNode titles directly", () => {
    const { getByTestId } = render(
      <TitledGreyBox
        title={<span data-testid="custom-title">Custom Node</span>}
      >
        <div>Body</div>
      </TitledGreyBox>,
    );

    expect(getByTestId("custom-title")).toBeDefined();
  });

  it("GreyRowBox applies hoverable styling by default and renders as custom element", () => {
    const { container } = render(
      <GreyRowBox as="a" href="/server/123" $hoverable={true}>
        <span>Server Item</span>
      </GreyRowBox>,
    );

    const anchor = container.querySelector("a")!;
    expect(anchor).toBeDefined();
    expect(anchor.getAttribute("href")).toBe("/server/123");
    expect(anchor.className).toContain("hover:border-neutral-500");
  });

  it("GreyRowBox disables hover styling when $hoverable is false", () => {
    const { container } = render(
      <GreyRowBox $hoverable={false}>
        <span>Static Row</span>
      </GreyRowBox>,
    );

    const div = container.querySelector("div")!;
    expect(div.className).not.toContain("hover:border-neutral-500");
  });

  it("ContentContainer centers content and applies standard responsive padding", () => {
    const { container, getByText } = render(
      <ContentContainer className="my-custom-margin">
        <p>Page Content</p>
      </ContentContainer>,
    );

    expect(getByText("Page Content")).toBeDefined();
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("max-w-[1136px]");
    expect(wrapper.className).toContain("my-custom-margin");
  });
});
