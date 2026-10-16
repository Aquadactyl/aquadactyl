import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const legacyPackages = new Set([
  "styled-components",
  "formik",
  "yup",
  "swr",
  "lodash",
  "@fortawesome/fontawesome-svg-core",
  "@fortawesome/free-brands-svg-icons",
  "@fortawesome/free-regular-svg-icons",
  "@fortawesome/free-solid-svg-icons",
  "@fortawesome/react-fontawesome",
]);

// Legacy utility values use the live appearance palette, including admin changes.
function tailwindConfig(root) {
  const css = fs.readFileSync(
    path.join(root, "resources/scripts/assets/index.css"),
    "utf8",
  );
  const colors = {};
  for (const [, name, shade, value] of css.matchAll(
    /--color-(\w+)-(\d+):\s*([^;]+);/g,
  )) {
    (colors[name] ??= {})[shade] = `var(--color-${name}-${shade}, ${value})`;
  }
  return {
    theme: {
      extend: {
        colors,
        fontFamily: {
          sans: ["var(--font-sans)"],
          header: ["var(--font-header)"],
        },
      },
    },
  };
}

export function legacyBlueprint(root, extraRoot) {
  const normalizedRoot = root.replaceAll("\\", "/");
  const extra = extraRoot?.replaceAll("\\", "/");
  const isExtension = (id) => {
    const file = id.split("?")[0].replaceAll("\\", "/");
    return (
      file.startsWith(`${normalizedRoot}/.blueprint/extensions/`) ||
      file.startsWith(
        `${normalizedRoot}/resources/scripts/blueprint/extensions/`,
      ) ||
      (extra && file.startsWith(`${extra}/`))
    );
  };
  const adapters = path.join(root, "resources/scripts/blueprint/compat");
  return {
    name: "aquadactyl:legacy-blueprint",
    enforce: "pre",
    resolveId(source, importer) {
      if (!importer || !isExtension(importer)) return;
      if (source === "easy-peasy") return path.join(adapters, "store.ts");
      if (source === "react-router-dom")
        return path.join(adapters, "router.tsx");
      if (
        source === "@/components/elements/Field" ||
        source ===
          `${normalizedRoot}/resources/scripts/components/elements/Field`
      )
        return path.join(adapters, "Field.tsx");
      if (source === "framer-motion")
        return this.resolve("motion/react", path.join(root, "package.json"));
      const name = source.startsWith("@")
        ? source.split("/").slice(0, 2).join("/")
        : source.split("/")[0];
      if (legacyPackages.has(name))
        return this.resolve(source, require.resolve("./package.json"), {
          skipSelf: true,
        });
      // A check may compile an extracted bundle outside the panel directory.
      if (extra && !source.startsWith(".") && !path.isAbsolute(source))
        return this.resolve(source, path.join(root, "package.json"), {
          skipSelf: true,
        });
    },
    async transform(code, id) {
      if (!isExtension(id) || !/\.[jt]sx?(?:\?|$)/.test(id)) return;
      if (!/twin\.macro|styled-components|\bcss\s*=/.test(code)) return;
      const { stripTypes } = await import("@aquadactyl/blueprint-typescript");
      const filename = id.split("?")[0];
      // Babel 8 handles TypeScript; legacy styling plugins still require Babel 7.
      const stripped = await stripTypes(code, filename);
      const { transformAsync } = require("@babel/core");
      const result = await transformAsync(stripped.code, {
        filename,
        babelrc: false,
        configFile: false,
        sourceMaps: true,
        inputSourceMap: stripped.map,
        parserOpts: { plugins: ["jsx"] },
        // Resolve the old macro beside its own Tailwind 3, never the panel's Tailwind 4.
        plugins: [
          [
            require("babel-plugin-macros"),
            {
              resolvePath: (source) => require.resolve(source),
              twin: {
                preset: "styled-components",
                config: tailwindConfig(root),
                dataTwProp: false,
              },
            },
          ],
          [
            require("babel-plugin-styled-components"),
            { displayName: false, pure: true },
          ],
        ],
      });
      return { code: result.code, map: result.map };
    },
  };
}
