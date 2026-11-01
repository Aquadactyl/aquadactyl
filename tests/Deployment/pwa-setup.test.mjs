import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { Window } from "happy-dom";

const read = (path) =>
  readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const workerSource = read("resources/pwa/service-worker.js");
const registerSource = read("public/pwa/register.js");
const setupSource = read("public/themes/pterodactyl/js/admin/setup.js");

function worker(fetch, language = "fr-FR") {
  const handlers = {};
  const entries = new Map();
  const deleted = [];
  let claimed = false;
  const cache = {
    put: async (key, value) => entries.set(key, value),
    match: async (key) => entries.get(key),
  };
  vm.runInNewContext(workerSource, {
    CACHE: "aquadactyl-offline-current",
    URL,
    fetch,
    caches: {
      open: async () => cache,
      keys: async () => [
        "unrelated-cache",
        "aquadactyl-offline-old",
        "aquadactyl-offline-current",
      ],
      delete: async (key) => deleted.push(key),
    },
    self: {
      navigator: { language },
      location: { origin: "https://panel.test" },
      clients: {
        claim: async () => {
          claimed = true;
        },
      },
      addEventListener: (event, fn) => {
        handlers[event] = fn;
      },
    },
  });
  const lifetime = (type) =>
    new Promise((resolve, reject) =>
      handlers[type]({ waitUntil: (promise) => promise.then(resolve, reject) }),
    );
  return { handlers, entries, deleted, lifetime, claimed: () => claimed };
}

test("PWA caches only public offline pages without cookies and cleans up only its own old caches", async () => {
  const requests = [];
  const sw = worker(async (url, options) => {
    requests.push({ url, options });
    return { ok: true, text: "Public offline page" };
  });
  await sw.lifetime("install");
  assert.equal(sw.entries.size, 3);
  assert.deepEqual(
    [...sw.entries.keys()],
    ["/pwa/offline?lang=en", "/pwa/offline?lang=fr", "/pwa/offline?lang=de"],
  );
  assert.ok(
    requests.every(
      ({ options }) =>
        options.credentials === "omit" &&
        options.cache === "no-store" &&
        options.redirect === "error",
    ),
  );
  await sw.lifetime("activate");
  assert.deepEqual(sw.deleted, ["aquadactyl-offline-old"]);
  assert.equal(sw.claimed(), true);
});

test("PWA refuses installation when the offline fallback is unavailable", async () => {
  const sw = worker(async () => ({ ok: false }));
  await assert.rejects(sw.lifetime("install"), /Offline page unavailable/);
});

test("PWA never intercepts API calls mutations subresources or other origins", () => {
  const sw = worker(() => assert.fail("Network should not be intercepted"));
  for (const request of [
    { url: "https://panel.test/api/client", method: "GET", mode: "navigate" },
    { url: "https://panel.test/api", method: "GET", mode: "navigate" },
    { url: "https://panel.test/pwa/offline", method: "GET", mode: "navigate" },
    { url: "https://panel.test/auth/logout", method: "POST", mode: "navigate" },
    { url: "https://panel.test/server/a", method: "GET", mode: "cors" },
    { url: "https://wings.test/server/a", method: "GET", mode: "navigate" },
  ])
    sw.handlers.fetch({
      request,
      respondWith: () => assert.fail("Request was intercepted"),
    });
});

test("PWA online navigation stays on the network and private responses never enter caches", async () => {
  const response = { private: "account data" };
  const sw = worker(async (_request, options) => {
    assert.equal(options.cache, "no-store");
    return response;
  });
  let result;
  sw.handlers.fetch({
    request: {
      url: "https://panel.test/admin/users",
      method: "GET",
      mode: "navigate",
    },
    respondWith: (promise) => {
      result = promise;
    },
  });
  assert.equal(await result, response);
  assert.equal(sw.entries.size, 0);
});

test("PWA navigation failures show a localized generic page, never cached account HTML", async () => {
  for (const [language, expected] of [
    ["fr-FR", "fr"],
    ["de-DE", "de"],
    ["es-ES", "en"],
  ]) {
    const sw = worker(async () => {
      throw new Error("Disconnected");
    }, language);
    sw.entries.set("/pwa/offline?lang=" + expected, "Safe fallback");
    let result;
    sw.handlers.fetch({
      request: {
        url: "https://panel.test/server/private",
        method: "GET",
        mode: "navigate",
      },
      respondWith: (promise) => {
        result = promise;
      },
    });
    assert.equal(await result, "Safe fallback");
    assert.equal(sw.entries.size, 1);
  }
});

test("PWA registration fails harmlessly on unsupported or insecure browsers", async () => {
  for (const secure of [false, true]) {
    vm.runInNewContext(registerSource, {
      window: { isSecureContext: secure },
      navigator: {},
    });
  }
  const window = new Window();
  let registered;
  vm.runInNewContext(registerSource, {
    window: Object.assign(window, { isSecureContext: true }),
    document: window.document,
    navigator: {
      serviceWorker: {
        register: (url, options) => {
          registered = { url, options };
          return Promise.reject(new Error("Unavailable"));
        },
      },
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(registered.url, "/pwa/service-worker");
  assert.equal(registered.options.scope, "/");
  assert.equal(registered.options.updateViaCache, "none");
  await window.happyDOM.abort();
});

test("PWA install buttons appear only for browser-supplied prompts and hide after use", async () => {
  const window = new Window();
  window.document.body.innerHTML =
    "<button data-pwa-install hidden><span>Install</span></button>";
  vm.runInNewContext(registerSource, {
    window: Object.assign(window, { isSecureContext: true }),
    document: window.document,
    navigator: { serviceWorker: { register: async () => {} } },
  });
  const button = window.document.querySelector("button");
  button.click();
  for (const fail of [false, true]) {
    let calls = 0;
    const event = new window.Event("beforeinstallprompt", { cancelable: true });
    event.prompt = async () => {
      calls++;
      if (fail) throw new Error("Withdrawn");
    };
    window.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(button.hidden, false);
    button.querySelector("span").click();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls, 1);
    assert.equal(button.hidden, true);
    assert.equal(button.disabled, false);
  }
  window.dispatchEvent(new window.Event("appinstalled"));
  assert.equal(button.hidden, true);
  await window.happyDOM.abort();
});

test("setup connectivity locks controls, renders daemon data as text and handles failures", async () => {
  const window = new Window();
  const document = window.document;
  document.head.innerHTML = '<meta name="_token" content="csrf">';
  document.body.innerHTML =
    '<main id="setup-wizard"><select id="setup-node"><option data-test-url="/test/1" data-config-url="/config/1">Node</option><option data-test-url="/test/2" data-config-url="/config/2">Node 2</option></select><a id="setup-node-config"></a><button id="setup-test-node" data-testing="Testing" data-failed="Failed"></button><p id="setup-connection-result"></p><details></details></main><div class="panel-toast" data-type="danger"></div>';
  const button = document.getElementById("setup-test-node");
  const node = document.getElementById("setup-node");
  const result = document.getElementById("setup-connection-result");
  let resolve;
  let calls = 0;
  vm.runInNewContext(setupSource, {
    window,
    document,
    URL,
    fetch: async (url, options) => {
      calls++;
      assert.equal(url, "/test/1");
      assert.equal(options.headers["X-CSRF-TOKEN"], "csrf");
      assert.equal(options.redirect, "error");
      return new Promise((done) => {
        resolve = done;
      });
    },
  });
  assert.equal(document.querySelector("details").open, true);
  button.click();
  assert.equal(button.disabled, true);
  assert.equal(node.disabled, true);
  button.dispatchEvent(new window.Event("click"));
  assert.equal(calls, 1);
  resolve({
    ok: true,
    json: async () => ({
      connected: true,
      message: '<img src=x onerror="bad()">',
      version: "1.0",
    }),
  });
  await new Promise((done) => setImmediate(done));
  assert.equal(result.querySelector("img"), null);
  assert.equal(result.textContent, '<img src=x onerror="bad()"> (1.0)');
  assert.equal(result.dataset.connected, "true");
  assert.equal(button.disabled, false);
  button.click();
  resolve({ ok: false, json: async () => ({}) });
  await new Promise((done) => setImmediate(done));
  assert.equal(result.textContent, "Failed");
  assert.equal(result.dataset.connected, "false");
  node.selectedIndex = 1;
  node.dispatchEvent(new window.Event("change"));
  assert.ok(
    document.getElementById("setup-node-config").href.endsWith("/config/2"),
  );
  assert.equal(result.textContent, "");
  await window.happyDOM.abort();
});

test("setup script is harmless outside the wizard", () => {
  const window = new Window();
  vm.runInNewContext(setupSource, { document: window.document });
  window.happyDOM.abort();
});

test("setup branding previews colour and restores the logo when the file selection is cleared", async () => {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML =
    '<main id="setup-wizard"><input id="setup-color" type="color" value="#237c7f"><output for="setup-color"></output><input id="setup-logo" type="file"><img id="setup-logo-preview" src="https://panel.test/logo.png"></main>';
  const revoked = [];
  vm.runInNewContext(setupSource, {
    document,
    URL: {
      createObjectURL: () => "blob:preview",
      revokeObjectURL: (url) => revoked.push(url),
    },
  });
  const color = document.getElementById("setup-color");
  color.value = "#aa33ff";
  color.dispatchEvent(new window.Event("input"));
  assert.equal(document.querySelector("output").textContent, "#aa33ff");
  const logo = document.getElementById("setup-logo");
  Object.defineProperty(logo, "files", {
    configurable: true,
    value: [{ type: "image/png" }],
  });
  logo.dispatchEvent(new window.Event("change"));
  assert.equal(document.querySelector("img").src, "blob:preview");
  Object.defineProperty(logo, "files", { configurable: true, value: [] });
  logo.dispatchEvent(new window.Event("change"));
  assert.equal(
    document.querySelector("img").src,
    "https://panel.test/logo.png",
  );
  assert.deepEqual(revoked, ["blob:preview"]);
  await window.happyDOM.abort();
});

test("disabling PWA unregisters only this panel's worker clears its caches and suppresses install prompts", async () => {
  const window = new Window({ url: "https://panel.test" });
  const document = window.document;
  const script = document.createElement("script");
  script.dataset.pwaEnabled = "false";
  script.dataset.pwaOffline = "false";
  Object.defineProperty(document, "currentScript", { value: script });
  document.body.innerHTML = "<button data-pwa-install hidden>Install</button>";
  const unregistered = [];
  const deleted = [];
  Object.defineProperty(window, "caches", {
    value: {
      keys: async () => ["aquadactyl-offline-current", "addon-cache"],
      delete: async (key) => deleted.push(key),
    },
  });
  vm.runInNewContext(registerSource, {
    window: Object.assign(window, { isSecureContext: true }),
    document,
    URL,
    navigator: {
      serviceWorker: {
        register: () => assert.fail("Disabled app must not register a worker"),
        getRegistrations: async () => [
          {
            active: { scriptURL: "https://panel.test/pwa/service-worker" },
            unregister: async () => unregistered.push("panel"),
          },
          {
            waiting: { scriptURL: "https://panel.test/addon-worker.js" },
            unregister: () => assert.fail("Addon worker must be preserved"),
          },
          {
            installing: {
              scriptURL: "https://elsewhere.test/pwa/service-worker",
            },
            unregister: () => assert.fail("Other origin must be preserved"),
          },
          {},
        ],
      },
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(unregistered, ["panel"]);
  assert.deepEqual(deleted, ["aquadactyl-offline-current"]);
  const event = new window.Event("beforeinstallprompt", { cancelable: true });
  event.prompt = () =>
    assert.fail("Disabled app must not prompt for installation");
  window.dispatchEvent(event);
  document.querySelector("button").click();
  assert.equal(document.querySelector("button").hidden, true);
  await window.happyDOM.abort();
});

test("offline support can be disabled independently and worker cleanup errors do not break the page", async () => {
  const window = new Window();
  const script = window.document.createElement("script");
  script.dataset.pwaEnabled = "true";
  script.dataset.pwaOffline = "false";
  Object.defineProperty(window.document, "currentScript", { value: script });
  window.document.body.innerHTML =
    "<button data-pwa-install hidden>Install</button>";
  vm.runInNewContext(registerSource, {
    window: Object.assign(window, { isSecureContext: true }),
    document: window.document,
    navigator: {
      serviceWorker: {
        register: () =>
          assert.fail("Offline-disabled app must not register a worker"),
        getRegistrations: async () => {
          throw new Error("Unavailable");
        },
      },
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  const event = new window.Event("beforeinstallprompt", { cancelable: true });
  event.prompt = async () => {};
  window.dispatchEvent(event);
  assert.equal(window.document.querySelector("button").hidden, false);
  await window.happyDOM.abort();
});

test("a disabled service worker activates immediately and retires itself without deleting addon caches", async () => {
  const handlers = {};
  const deleted = [];
  let skipped = false;
  let claimed = false;
  let unregistered = false;
  vm.runInNewContext(read("resources/pwa/unregister-worker.js"), {
    caches: {
      keys: async () => ["aquadactyl-offline-old", "addon"],
      delete: async (key) => deleted.push(key),
    },
    self: {
      addEventListener: (type, callback) => {
        handlers[type] = callback;
      },
      skipWaiting: async () => {
        skipped = true;
      },
      clients: {
        claim: async () => {
          claimed = true;
        },
      },
      registration: {
        unregister: async () => {
          unregistered = true;
        },
      },
    },
  });
  for (const type of ["install", "activate"])
    await new Promise((resolve, reject) =>
      handlers[type]({ waitUntil: (promise) => promise.then(resolve, reject) }),
    );
  assert.equal(skipped, true);
  assert.equal(claimed, true);
  assert.equal(unregistered, true);
  assert.deepEqual(deleted, ["aquadactyl-offline-old"]);
});
