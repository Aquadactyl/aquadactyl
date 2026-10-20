import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { releaseVersion } from "../../scripts/helpers/release-version.mjs";

for (const [tag, version] of [
  ["v1", "1"],
  ["v1.2", "1.2"],
  ["v1.2.3", "1.2.3"],
  ["v0.1.0-rc.1", "0.1.0-rc.1"],
  ["v2.0.0-beta-2", "2.0.0-beta-2"],
]) {
  test("release CLI accepts a version tag: " + tag, () => {
    assert.equal(releaseVersion(tag), version);
    const result = spawnSync(
      process.execPath,
      ["scripts/helpers/release-version.mjs", tag],
      { encoding: "utf8", windowsHide: true },
    );
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), version);
  });
}

for (const tag of [
  undefined,
  {},
  "v1.2.3$(echo injected)",
  "v1.2.3`echo injected`",
  "v1.2.3';system('id');//",
  "v1.2.3/../../config",
  "v1.2.3\nRUN evil",
  "v1.2.3\n",
  "canary",
  "v1.2.3-" + "a".repeat(101),
]) {
  test(
    "release CLI refuses unsafe tag metadata: " + JSON.stringify(tag),
    () => {
      assert.throws(() => releaseVersion(tag), /Release tags must use/);
      const result = spawnSync(
        process.execPath,
        [
          "scripts/helpers/release-version.mjs",
          ...(typeof tag === "string" ? [tag] : []),
        ],
        { encoding: "utf8", windowsHide: true },
      );
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /Release tags must use/);
    },
  );
}

test("canary is accepted only when the Docker release caller explicitly allows it", () => {
  assert.equal(releaseVersion("canary", true), "canary");
  const result = spawnSync(
    process.execPath,
    ["scripts/helpers/release-version.mjs", "canary", "--allow-canary"],
    { encoding: "utf8", windowsHide: true },
  );
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), "canary");
  assert.throws(
    () => releaseVersion("canary$(echo injected)", true),
    /Release tags must use/,
  );
});

const packages = fs
  .readdirSync("node_modules/.pnpm")
  .filter((name) => /^braces@3\.0\.3(?:_|$)/.test(name));
assert.ok(
  packages.length > 0,
  "The locked braces dependency must be installed for the mitigation test",
);
for (const packageDirectory of packages) {
  const require = createRequire(
    path.resolve(
      "node_modules/.pnpm",
      packageDirectory,
      "node_modules/braces/package.json",
    ),
  );
  const braces = require(".");
  for (const operation of ["parse", "compile", "expand"]) {
    for (const [open, close] of [
      ["{", "}"],
      ["(", ")"],
    ]) {
      test(
        "patched braces " + operation + " rejects deep " + open + " nesting",
        () => {
          assert.throws(
            () =>
              braces[operation](open.repeat(2000) + "a,b" + close.repeat(2000)),
            (error) =>
              error instanceof SyntaxError &&
              /maximum nesting depth/.test(error.message),
          );
        },
      );
    }
  }
  test("patched braces preserves ordinary expansion", () => {
    assert.deepEqual(braces.expand("server-{1..3}.log"), [
      "server-1.log",
      "server-2.log",
      "server-3.log",
    ]);
  });
}
