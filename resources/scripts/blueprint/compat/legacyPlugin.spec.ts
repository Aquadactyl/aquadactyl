import path from "node:path";
import { createRequire } from "node:module";
import { legacyBlueprint } from "@aquadactyl/blueprint-compat/vite";

const root = process.cwd();

it("rejects excessive nesting in the legacy glob parser while preserving normal expansion", () => {
  const requireCompat = createRequire(
    path.join(root, "packages/blueprint-compat/package.json"),
  );
  const requireTailwind = createRequire(requireCompat.resolve("tailwindcss"));
  const requireMicromatch = createRequire(
    requireTailwind.resolve("micromatch"),
  );
  const braces = requireMicromatch("braces");
  expect(braces.expand("{a,b}.tsx")).toEqual(["a.tsx", "b.tsx"]);
  expect(() => braces("{".repeat(1000) + "a,b" + "}".repeat(1000))).toThrow(
    /maximum nesting depth/,
  );
  expect(() => braces("(".repeat(1000) + "a" + ")".repeat(1000))).toThrow(
    /maximum nesting depth/,
  );
});
const addon = path.join(
  root,
  ".blueprint/extensions/legacy/components/Card.tsx",
);
const symlink = path.join(
  root,
  "resources/scripts/blueprint/extensions/legacy/Card.tsx",
);

it("scopes module adapters to addons and leaves the modern panel alone", async () => {
  const plugin = legacyBlueprint(root) as any;
  const resolve = vi.fn(async (source) => ({ id: source }));
  const call = (source: string, importer?: string) =>
    plugin.resolveId.call({ resolve }, source, importer);
  expect(call("easy-peasy")).toBeUndefined();
  expect(
    call("easy-peasy", path.join(root, "resources/scripts/components/App.tsx")),
  ).toBeUndefined();
  expect(call("easy-peasy", addon)).toBe(
    path.join(root, "resources/scripts/blueprint/compat/store.ts"),
  );
  expect(call("react-router-dom", symlink)).toBe(
    path.join(root, "resources/scripts/blueprint/compat/router.tsx"),
  );
  expect(call("@/components/elements/Field", addon)).toBe(
    path.join(root, "resources/scripts/blueprint/compat/Field.tsx"),
  );
  expect(
    call(
      `${root.replaceAll("\\", "/")}/resources/scripts/components/elements/Field`,
      addon,
    ),
  ).toBe(path.join(root, "resources/scripts/blueprint/compat/Field.tsx"));
  expect(await call("framer-motion", addon)).toEqual({ id: "motion/react" });
  expect(await call("@fortawesome/free-solid-svg-icons", addon)).toEqual({
    id: "@fortawesome/free-solid-svg-icons",
  });
  expect(await call("lodash/get", addon)).toEqual({ id: "lodash/get" });
  expect(call("unlisted", addon)).toBeUndefined();
});

it("resolves dependencies for checks outside the panel without intercepting relative files", async () => {
  const plugin = legacyBlueprint(root, "/tmp/bundle/components") as any;
  const resolve = vi.fn(async () => ({ id: "panel-axios" }));
  expect(
    await plugin.resolveId.call(
      { resolve },
      "axios",
      "/tmp/bundle/components/Card.tsx",
    ),
  ).toEqual({ id: "panel-axios" });
  expect(resolve).toHaveBeenCalledWith(
    "axios",
    path.join(root, "package.json"),
    { skipSelf: true },
  );
  expect(
    plugin.resolveId.call(
      { resolve },
      "./helper",
      "/tmp/bundle/components/Card.tsx",
    ),
  ).toBeUndefined();
  expect(
    plugin.resolveId.call({ resolve }, path.join(root, "absolute.ts"), addon),
  ).toBeUndefined();
  expect(
    plugin.resolveId.call(
      { resolve },
      "axios",
      "/tmp/bundle/components-other/Card.tsx",
    ),
  ).toBeUndefined();
});

it("compiles original twin syntax, css props and styled components using the current palette", async () => {
  const plugin = legacyBlueprint(root) as any;
  const code = `import tw, { styled, css } from 'twin.macro';
    const Card = tw.div\`p-6 bg-neutral-800 text-primary-500\`;
    const Title = styled.h2\`\${tw\`font-header text-gray-100\`} color: red;\`;
    const accent = css\`color: blue;\`;
    export default ({ active }: { active: boolean }) => <Card css={[tw\`mt-4 hover:bg-blue-500\`, active && accent]}><Title tw="text-lg">Legacy</Title></Card>;`;
  const output = await plugin.transform(code, `${addon}?import`);
  expect(output.code).not.toContain("twin.macro");
  expect(output.code).toContain("styled-components");
  expect(output.code).toContain("var(--color-primary-500");
  expect(output.code).toContain("var(--color-neutral-800");
  expect(output.code).toContain("var(--font-header)");
  expect(output.code).toContain("&:hover");
  expect(output.map.sources.length).toBe(1);
});

it("ignores modern modules and non-source assets; rejects unknown legacy utilities", async () => {
  const plugin = legacyBlueprint(root) as any;
  expect(
    await plugin.transform(
      "import tw from 'twin.macro'",
      path.join(root, "resources/scripts/core.tsx"),
    ),
  ).toBeUndefined();
  expect(
    await plugin.transform("css=", addon.replace(".tsx", ".css")),
  ).toBeUndefined();
  expect(
    await plugin.transform("export default () => <div />", addon),
  ).toBeUndefined();
  await expect(
    plugin.transform(
      "import tw from 'twin.macro'; export default tw.div`does-not-exist`;",
      addon,
    ),
  ).rejects.toThrow(/does-not-exist/);
});
