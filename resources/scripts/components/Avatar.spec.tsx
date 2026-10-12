import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Avatar from "@/components/Avatar";
import { store } from "@/state";
import { StoreProvider } from "@/state/hooks";

describe("Avatar", () => {
  afterEach(() => store.getActions().user.updateUserData({ avatarUrl: null }));

  it("renders an uploaded profile picture for the current user", () => {
    store.getActions().user.updateUserData({
      username: "aquadactyl-user",
      avatarUrl: "/storage/avatars/example.png",
    });
    const markup = renderToStaticMarkup(
      <StoreProvider store={store}>
        <Avatar.User size={64} />
      </StoreProvider>,
    );

    expect(markup).toContain('src="/storage/avatars/example.png"');
    expect(markup).toContain('width="64"');
    expect(markup).not.toContain("<svg");
  });

  it("keeps the generated avatar when no profile picture has been uploaded", () => {
    store.getActions().user.updateUserData({ avatarUrl: null });
    const markup = renderToStaticMarkup(
      <StoreProvider store={store}>
        <Avatar.User size={64} />
      </StoreProvider>,
    );

    expect(markup).toContain("<svg");
    expect(markup).not.toContain("<img");
  });

  it("renders another activity actor's uploaded picture without depending on the current account", () => {
    const markup = renderToStaticMarkup(
      <Avatar
        name={"other-user"}
        src={"/storage/avatars/other.png"}
        alt={"Other user's profile picture"}
        size={40}
      />,
    );

    expect(markup).toContain('src="/storage/avatars/other.png"');
    expect(markup).toContain('alt="Other user&#x27;s profile picture"');
    expect(markup).not.toContain("<svg");
  });

  it.each(["beam", "bauhaus", "pixel", "sunset", "ring", "marble"] as const)(
    "renders the %s variant with the panel React runtime",
    (variant) => {
      const markup = renderToStaticMarkup(
        <Avatar name={"aquadactyl-user"} variant={variant} size={40} />,
      );

      expect(markup).toContain("<svg");
      expect(markup).toContain('width="40"');
    },
  );

  it("handles square avatar, image onError fallback, and src change", () => {
    const { render, fireEvent } = require("@testing-library/react");
    const { container, rerender } = render(
      <Avatar name={"test-user"} src={"/bad-image.png"} square />,
    );

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.style.borderRadius).toBe("0px");

    // Trigger onError
    fireEvent.error(img!);

    // Should now render BoringAvatar svg
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();

    // Updating src resets failed state
    rerender(<Avatar name={"test-user"} src={"/new-image.png"} square />);
    expect(container.querySelector("img")).not.toBeNull();
  });

  it("renders UserAvatar with fallback when user is null or defaults are used", () => {
    const { render } = require("@testing-library/react");
    (store.getActions() as any).user.setUserData(null);

    const { container } = render(
      <StoreProvider store={store}>
        <Avatar.User square />
      </StoreProvider>,
    );

    expect(container.querySelector("svg")).not.toBeNull();
  });
});
