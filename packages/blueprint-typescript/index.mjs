import { transformAsync } from "@babel/core";
import jsx from "@babel/plugin-syntax-jsx";
import typescript from "@babel/preset-typescript";

// Keep Babel 8's TypeScript compiler separate from legacy macro/styling peers.
export function stripTypes(code, filename) {
  return transformAsync(code, {
    filename,
    babelrc: false,
    configFile: false,
    sourceMaps: true,
    plugins: [jsx],
    presets: [
      [typescript, { ignoreExtensions: true, onlyRemoveTypeImports: false }],
    ],
  });
}
