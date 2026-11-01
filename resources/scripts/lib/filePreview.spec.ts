import { describe, expect, it } from "vitest";
import { imageMimeType } from "./filePreview";

describe("file image previews", () => {
  it.each([
    ["photo.PNG", "application/octet-stream", "image/png"],
    ["photo.jpeg", "image/jpeg", "image/jpeg"],
    ["animation.gif", "image/gif", "image/gif"],
    ["image.webp", "image/webp", "image/webp"],
    ["image.avif", "image/avif", "image/avif"],
    ["image.bmp", "image/bmp", "image/bmp"],
    ["favicon.ico", "image/vnd.microsoft.icon", "image/x-icon"],
    ["image", "image/png", "image/png"],
    ["image", "application/octet-stream", null],
    ["page.html", "text/html", null],
    ["vector.svg", "image/svg+xml", null],
    ["misleading.png", "image/svg+xml", null],
  ])("classifies %s as %s", (name, mimetype, expected) => {
    expect(imageMimeType({ name, mimetype, isFile: true })).toBe(expected);
  });
  it("never previews a directory named like an image", () => {
    expect(
      imageMimeType({
        name: "folder.png",
        mimetype: "image/png",
        isFile: false,
      }),
    ).toBeNull();
  });
});
