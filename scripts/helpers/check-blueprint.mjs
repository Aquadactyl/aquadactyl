import fs from "node:fs";
import path from "node:path";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { legacyBlueprint } from "@aquadactyl/blueprint-compat/vite";

const root = process.cwd();
const bundle = path.resolve(process.argv[2]);
const components = process.argv[3];
const identifier = process.argv[4];
console.log("Aquadactyl Blueprint compatibility API v1");
const scripts = fs.readdirSync(bundle, { recursive: true }).filter((file) => /(?:^|[/\\])(?:install|update|remove)\.sh$/.test(file));
if (scripts.length) console.log("Review required: custom lifecycle scripts may patch panel files. The frontend check cannot validate those changes.");
if (!components) {
  console.log("No frontend components to compile. PHP, Blade and CSS use the retained Blueprint interfaces; their behavior still needs testing.");
} else {
  const directory = path.resolve(bundle, components);
  if (!directory.startsWith(`${bundle}${path.sep}`)) throw new Error("Components must stay inside the extension bundle.");
  const input = fs.readdirSync(directory, { recursive: true })
    .filter((file) => /\.[jt]sx?$/.test(file) && !file.endsWith(".d.ts"))
    .map((file) => path.join(directory, file));
  if (!input.length) throw new Error("The components directory contains no JavaScript or TypeScript files.");
  try {
    await build({
      configFile: false, envDir: false, root, logLevel: "warn",
      plugins: [legacyBlueprint(root, directory), react()],
      resolve: {
        dedupe: ["react", "react-dom", "styled-components"],
        alias: {
          ...(identifier ? { [`@blueprint/extensions/${identifier}`]: directory } : {}),
          "@blueprint/extensions/{identifier}": directory,
          "@": path.join(root, "resources/scripts"),
          "@blueprint": path.join(root, "resources/scripts/blueprint"),
          "@definitions": path.join(root, "resources/scripts/api/definitions"),
          "@feature": path.join(root, "resources/scripts/components/server/features"),
        },
      },
      define: { "process.env.DEBUG": "false", "process.env.WEBPACK_BUILD_HASH": '"compatibility-check"' },
      build: { write: false, emptyOutDir: false, minify: false, rollupOptions: { input, preserveEntrySignatures: "strict" } },
    });
    console.log("Frontend compiled successfully with the compatibility adapters. No panel files were changed.");
  } catch (error) {
    console.error(`Compatibility check failed: ${error.message}`);
    console.error("This addon uses an unsupported dependency or panel interface. See docs/BLUEPRINT-COMPATIBILITY.md.");
    process.exitCode = 1;
  }
}
