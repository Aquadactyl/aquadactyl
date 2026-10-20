/** Validate tag metadata before using it in release scripts or generated PHP. */
export function releaseVersion(tag, allowCanary = false) {
  if (allowCanary && tag === "canary") return "canary";
  if (
    typeof tag !== "string" ||
    tag.length > 100 ||
    tag.trim() !== tag ||
    !/^v(?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*)){0,2}(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(tag)
  ) {
    throw new Error("Release tags must use a v-prefixed version or versioned prerelease.");
  }
  return tag.slice(1);
}

import { pathToFileURL } from "node:url";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.stdout.write(releaseVersion(process.argv[2], process.argv[3] === "--allow-canary") + "\n");
  } catch (error) {
    process.stderr.write(error.message + "\n");
    process.exitCode = 1;
  }
}
