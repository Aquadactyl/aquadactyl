import { FileObject } from "@/api/server/files/loadDirectory";

export const LARGE_FILE_THRESHOLD = 1024 * 1024;

const imageTypes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  bmp: "image/bmp",
  ico: "image/x-icon",
};

export const imageMimeType = (
  file: Pick<FileObject, "name" | "isFile" | "mimetype">,
): string | null => {
  if (!file.isFile) return null;
  const mime = file.mimetype.toLowerCase().split(";")[0];
  if (mime === "image/svg+xml") return null;
  if (Object.values(imageTypes).includes(mime)) return mime;
  if (mime === "image/vnd.microsoft.icon") return "image/x-icon";
  const extension = file.name.split(".").pop()!.toLowerCase();
  return file.name.includes(".") ? (imageTypes[extension] ?? null) : null;
};
