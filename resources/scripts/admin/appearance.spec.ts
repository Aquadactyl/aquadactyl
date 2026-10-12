import script from "../../../public/themes/pterodactyl/js/admin/appearance.js?raw";

const id = "12345678-1234-1234-1234-123456789abc";
const logo = `/storage/branding/${id}.png`;
const blob = `blob:http://localhost/${id}`;
const unsafeUrls = [
  "javascript:alert(document.domain)",
  "JaVaScRiPt:alert(1)",
  "\n javascript:alert(1)",
  "data:image/svg+xml,<svg onload=alert(1)></svg>",
  "data:text/html,<script>alert(1)</script>",
  "https://attacker.example/logo.png",
  "//attacker.example/logo.png",
  "/\\attacker.example/logo.png",
  blob,
  "/storage/branding/../../admin/settings",
  `/storage/branding/${id}.svg`,
  `/storage/branding/${id}.png?redirect=https://attacker.example`,
  `/storage/branding/${id}.png\n`,
  '/storage/branding/"><img src=x onerror=alert(1)>',
];

let windowEvents: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  document.body.innerHTML = `
    <form id="appearance-settings"></form>
    <span id="appearance-save-status" data-saved="Saved" data-unsaved="Unsaved"></span>
    <div id="appearance-editor" data-upload-error="Upload failed">
      <input id="site-name" form="appearance-settings" name="app:name" value="Aquadactyl">
      <input id="primary-color" type="color" form="appearance-settings" name="primary_color" value="#237c7f">
      <input id="primary-color-hex" value="#237c7f">
      <input type="radio" name="login_layout" value="center" checked>
      <select id="login-logo-position"><option value="above">Above</option></select>
      <select id="show-site-name"><option value="true">Show name</option></select>
      <img id="site-logo-preview">
      <div id="login-preview">
        <div class="appearance-preview-background"></div>
        <div class="appearance-preview-logo"><img><span class="preview-site-name"></span></div>
      </div>
      <div id="client-preview">
        <div class="appearance-preview-background"></div>
        <div class="preview-client-brand"><img><span class="preview-site-name"></span></div>
      </div>
      ${["logo", "login", "client"]
        .map(
          (area) => `
        <input id="${area}-blur" value="6"><span id="${area}-blur-value"></span>
        <input id="${area}-overlay" value="50"><span id="${area}-overlay-value"></span>
        <form action="/admin/settings/${area}" data-image-action="${area}">
          <input type="file" name="image" data-preview-area="${area}">
          <button type="submit">Upload</button>
        </form>
        <form data-image-action="${area}" data-image-remove="${area}" hidden><button>Remove</button></form>
        <span data-image-status="${area}"></span>
      `,
        )
        .join("")}
    </div>`;
  vi.stubGlobal("fetch", vi.fn());
  vi.spyOn(URL, "createObjectURL").mockReturnValue(blob);
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  windowEvents = vi.spyOn(window, "addEventListener");
});

afterEach(() => {
  window.dispatchEvent(new Event("pagehide"));
  for (const [type, listener] of windowEvents.mock.calls) {
    window.removeEventListener(type, listener);
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

function element<T extends HTMLElement = HTMLElement>(selector: string): T {
  return document.querySelector<T>(selector)!;
}

function start() {
  // Run the actual standalone admin script against a fresh DOM for each case.
  new Function("document", "window", "URL", "FormData", script)(
    document,
    window,
    URL,
    window.FormData,
  );
}

function expectLogos(login: string, client = login) {
  expect(element("#login-preview img").getAttribute("src")).toBe(login);
  expect(element("#client-preview img").getAttribute("src")).toBe(client);
  expect(element("#site-logo-preview").getAttribute("src")).toBe(login);
}

function expectPreview(area: string, url = "") {
  const actual =
    area === "logo"
      ? ["#login-preview img", "#client-preview img", "#site-logo-preview"].map(
          (selector) => element(selector).getAttribute("src"),
        )
      : [
          element(`#${area}-preview .appearance-preview-background`).style
            .backgroundImage,
        ];
  const expected =
    area === "logo"
      ? [
          url || "/branding/aquadactyl-wordmark.png",
          url || "/branding/aquadactyl-emblem.png",
          url || "/branding/aquadactyl-wordmark.png",
        ]
      : [url ? `url("${url}")` : ""];
  expect(actual).toEqual(expected);
}

function selectFile(area: string, type = "image/png") {
  const input = element<HTMLInputElement>(`[data-preview-area="${area}"]`);
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [
      new File(["image bytes"], "<img src=x onerror=alert(1)>.png", { type }),
    ],
  });
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

async function upload(area: string, url: unknown) {
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify({ url, message: "Uploaded" })),
  );
  element(`[data-image-action="${area}"]`).dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true }),
  );
  await vi.waitFor(() =>
    expect(
      element(`[data-image-action="${area}"]`).hasAttribute("aria-busy"),
    ).toBe(false),
  );
}

it("renders saved PNG logos and backgrounds from the panel upload directories", () => {
  element("#appearance-editor").dataset.logo = logo;
  for (const area of ["login", "client"]) {
    element(`#${area}-preview`).dataset.background =
      `/storage/backgrounds/${area}/${id}.png`;
  }
  start();
  expectLogos(logo);
  for (const area of ["login", "client"]) {
    expect(
      element(`#${area}-preview .appearance-preview-background`).style
        .backgroundImage,
    ).toContain(`/storage/backgrounds/${area}/${id}.png`);
  }
});

it.each(unsafeUrls)("rejects an untrusted stored image URL: %s", (url) => {
  element("#appearance-editor").dataset.logo = url;
  element("#login-preview").dataset.background = url;
  element("#client-preview").dataset.background = url;
  start();
  expectLogos(
    "/branding/aquadactyl-wordmark.png",
    "/branding/aquadactyl-emblem.png",
  );
  for (const area of ["login", "client"]) {
    expect(
      element(`#${area}-preview .appearance-preview-background`).style
        .backgroundImage,
    ).toBe("");
  }
});

it.each(["logo", "login", "client"])(
  "previews local raster uploads and releases their URLs: %s",
  (area) => {
    start();
    selectFile(area);
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expectPreview(area, blob);
    selectFile(area, "image/svg+xml");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(blob);
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expectPreview(area);
  },
);

it.each(unsafeUrls)(
  "rejects an untrusted logo upload response: %s",
  async (url) => {
    start();
    await upload("logo", url);
    expect(element("#appearance-editor").dataset.logo).toBeUndefined();
    expectLogos(
      "/branding/aquadactyl-wordmark.png",
      "/branding/aquadactyl-emblem.png",
    );
    expect(element('[data-image-status="logo"]').textContent).toBe(
      "Upload failed",
    );
  },
);

it.each(["logo", "login", "client"])(
  "updates an uploaded PNG and supports its removal: %s",
  async (area) => {
    const url =
      area === "logo" ? logo : `/storage/backgrounds/${area}/${id}.png`;
    start();
    selectFile(area);
    await upload(area, url);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(blob);
    expectPreview(area, url);
    expect(element(`[data-image-remove="${area}"]`).hidden).toBe(false);
    await upload(area, null);
    expect(element(`[data-image-remove="${area}"]`).hidden).toBe(true);
    expectPreview(area);
  },
);

it("keeps site names as text in both previews", () => {
  const name = "<img src=x onerror=alert(1)> & Custom Panel";
  element<HTMLInputElement>("#site-name").value = name;
  start();
  for (const preview of document.querySelectorAll(".preview-site-name")) {
    expect(preview.textContent).toBe(name);
    expect(preview.children).toHaveLength(0);
  }
});

it("ignores unrecognized upload areas", () => {
  element('[data-preview-area="logo"]').dataset.previewArea = "__proto__";
  element('[data-image-action="logo"]').dataset.imageAction = "__proto__";
  start();
  selectFile("__proto__");
  element('[data-image-action="__proto__"]').dispatchEvent(
    new Event("submit", { cancelable: true }),
  );
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});
