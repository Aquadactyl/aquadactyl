import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { Window } from "happy-dom";

const source = readFileSync(
  new URL(
    "../../public/themes/pterodactyl/js/admin/toasts.js",
    import.meta.url,
  ),
  "utf8",
);

test("admin toasts render untrusted input as text and preserve a safe legacy notify API", () => {
  const window = new Window();
  const timers = new Map();
  const payload = '</script><img src=x onerror="window.untrusted=true">';
  window.jQuery = {};
  window.AquadactylInitialToasts = [{ type: "danger", message: payload }];
  const context = vm.createContext({
    window,
    document: window.document,
    setTimeout: (fn) => {
      const id = timers.size + 1;
      timers.set(id, fn);
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  });
  vm.runInContext(source, context);
  assert.equal(
    window.document.querySelector(".panel-toast").textContent,
    payload,
  );
  assert.equal(window.document.querySelector(".panel-toast img"), null);
  assert.equal(window.untrusted, undefined);
  assert.equal(
    window.document.querySelector(".panel-toast").getAttribute("role"),
    "alert",
  );
  assert.equal(timers.size, 0);
  const notification = window.jQuery.notify(
    { message: "Saved" },
    { type: "success" },
  );
  notification.update("message", payload);
  assert.equal(window.document.querySelectorAll(".panel-toast img").length, 0);
  notification.update({ message: "Updated" });
  notification.close();
  window.document.querySelector(".panel-toast button").click();
  assert.equal(window.document.querySelectorAll(".panel-toast").length, 0);
  for (let i = 0; i < 7; i++) window.AquadactylToast(String(i), "unknown");
  assert.equal(window.document.querySelectorAll(".panel-toast").length, 5);
  assert.equal(
    window.document.querySelector(".panel-toast").dataset.type,
    "info",
  );
  window.happyDOM.abort();
});

test("admin notification polling skips old records and stops after access is disabled", async () => {
  const window = new Window();
  window.AquadactylNotificationOptions = {
    enabled: true,
    labels: { schedule: { complete: "Completed" } },
  };
  let timer;
  const requests = [];
  const responses = [
    { ok: true, json: async () => ({ data: [], cursor: 2 }) },
    {
      ok: true,
      json: async () => ({
        data: [
          {
            event: "schedule.complete",
            server_name: "My server",
            detail: "Nightly",
            read_at: null,
          },
          { event: "backup.fail", server_name: "My server", read_at: null },
          { event: "power.start", server_name: "Read", read_at: "read" },
        ],
        cursor: 5,
      }),
    },
    { ok: false, status: 403 },
  ];
  const context = vm.createContext({
    window,
    document: window.document,
    setTimeout: (fn) => {
      timer = fn;
      return 1;
    },
    clearTimeout: () => {},
    fetch: async (url) => {
      requests.push(url);
      return responses.shift();
    },
  });
  vm.runInContext(source, context);
  const settle = async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  };
  await settle();
  assert.equal(window.document.querySelectorAll(".panel-toast").length, 0);
  await timer();
  await settle();
  assert.equal(requests[1], "/api/client/account/notifications?after_id=2");
  assert.match(
    window.document.querySelector(".panel-toast").textContent,
    /Completed · Nightly/,
  );
  assert.equal(window.document.querySelectorAll(".panel-toast").length, 2);
  await timer();
  await settle();
  window.document.dispatchEvent(new window.Event("visibilitychange"));
  await settle();
  assert.equal(requests.length, 3);
  window.happyDOM.abort();
});
