import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { Window } from "happy-dom";

const paths = [
  "public/themes/pterodactyl/js/admin/new-server.js",
  "resources/views/admin/servers/view/details.blade.php",
  "resources/views/admin/servers/view/startup.blade.php",
  "resources/views/admin/nodes/view/index.blade.php",
];
const payloads = [
  '"><img src=x onerror="window.untrusted=true">',
  '" autofocus onfocus="window.untrusted=true" data-injected="',
  "' onfocus='window.untrusted=true",
  "</script><script>window.untrusted=true</script>",
  "O'Connor & Müller \\ \\u2028",
];

for (const path of paths) {
  const source = readFileSync(
    new URL("../../" + path, import.meta.url),
    "utf8",
  );
  const helpers = [
    ...source.matchAll(/function escapeHtml\(str\) \{[\s\S]*?\n    \}/g),
  ];
  assert.equal(
    helpers.length,
    path.endsWith("new-server.js") ? 2 : 1,
    "Test the actual helpers in " + path,
  );
  helpers.forEach((match, index) => {
    const encode = vm.runInNewContext("(" + match[0] + ")");
    for (const payload of payloads) {
      test(
        path +
          " helper " +
          index +
          " preserves input as text and one quoted attribute: " +
          JSON.stringify(payload),
        () => {
          const window = new Window();
          try {
            const container = window.document.createElement("div");
            container.innerHTML =
              '<input value="' +
              encode(payload) +
              '"><span>' +
              encode(payload) +
              "</span>";
            const input = container.querySelector("input");
            assert.equal(input.value, payload);
            assert.equal(input.getAttributeNames().join(","), "value");
            assert.equal(container.querySelector("span").textContent, payload);
            assert.equal(
              container.querySelectorAll(
                "img,script,svg,iframe,[onfocus],[onerror],[autofocus]",
              ).length,
              0,
            );
          } finally {
            window.close();
          }
        },
      );
    }
  });
}
