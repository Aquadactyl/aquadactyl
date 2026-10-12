import axios, { AxiosProgressEvent } from "axios";
import getFileUploadUrl from "@/api/server/files/getFileUploadUrl";
import createDirectory from "@/api/server/files/createDirectory";
import React, { useEffect, useRef, useState } from "react";
import { ModalMask } from "@/components/elements/Modal";
import Fade from "@/components/elements/Fade";
import useEventListener from "@/plugins/useEventListener";
import { useFlashKey } from "@/plugins/useFlash";
import useFileManagerQuery from "@/plugins/useFileManagerQuery";
import usePanelTranslation from "@/plugins/usePanelTranslation";
import { ServerContext } from "@/state/server";
import { WithClassname } from "@/components/types";
import Portal from "@/components/elements/Portal";
import { ChevronDown, CloudUpload, FileUp, FolderUp } from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import clsx from "clsx";
import { cleanDirectoryPath } from "@/helpers";
import { join } from "pathe";

interface UploadItem {
  file: File;
  relativePath: string;
}

function isFileOrDirectory(event: DragEvent): boolean {
  if (!event.dataTransfer?.types) {
    return false;
  }

  return event.dataTransfer.types.some(
    (value) => value.toLowerCase() === "files",
  );
}

export async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit = 5,
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;
  let firstError: unknown = null;

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    async () => {
      while (index < tasks.length && !firstError) {
        const currentIndex = index++;
        try {
          results[currentIndex] = await tasks[currentIndex]();
        } catch (err) {
          if (!firstError) firstError = err;
          break;
        }
      }
    },
  );

  await Promise.all(workers);
  if (firstError) {
    throw firstError;
  }
  return results;
}

async function readAllDirectoryEntries(
  dirReader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {
  const entries: FileSystemEntry[] = [];
  while (true) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      dirReader.readEntries(resolve, reject);
    });
    if (batch.length === 0) break;
    entries.push(...batch);
  }
  return entries;
}

async function traverseEntry(
  entry: FileSystemEntry,
  parentPath: string,
  uploadItems: UploadItem[],
  emptyDirs: string[],
): Promise<void> {
  const currentPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;

  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      (entry as FileSystemFileEntry).file(resolve, reject);
    });
    uploadItems.push({ file, relativePath: currentPath });
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    try {
      const children = await readAllDirectoryEntries(reader);
      if (children.length === 0) {
        emptyDirs.push(currentPath);
      } else {
        await Promise.all(
          children.map((child) =>
            traverseEntry(child, currentPath, uploadItems, emptyDirs),
          ),
        );
      }
    } catch {
      // Ignore directory read errors
    }
  }
}

export default ({ className }: WithClassname) => {
  const fileUploadInput = useRef<HTMLInputElement>(null);
  const folderUploadInput = useRef<HTMLInputElement>(null);

  const [visible, setVisible] = useState(false);
  const timeouts = useRef<NodeJS.Timeout[]>([]);

  const { t } = usePanelTranslation();
  const { mutate } = useFileManagerQuery();
  const { clearAndAddHttpError } = useFlashKey("files");

  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const directory = ServerContext.useStoreState(
    (state) => state.files.directory,
  );
  const {
    clearFileUploads,
    removeFileUpload,
    pushFileUpload,
    setUploadProgress,
  } = ServerContext.useStoreActions((actions) => actions.files);

  useEventListener(
    "dragenter",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isFileOrDirectory(e)) {
        setVisible(true);
      }
    },
    { capture: true },
  );

  useEventListener("dragexit", () => setVisible(false), { capture: true });

  useEventListener("keydown", () => setVisible(false));

  useEffect(() => {
    folderUploadInput.current?.setAttribute("webkitdirectory", "");
    folderUploadInput.current?.setAttribute("directory", "");
    return () => timeouts.current.forEach(clearTimeout);
  }, []);

  const onUploadProgress = (data: AxiosProgressEvent, name: string) => {
    setUploadProgress({ name, loaded: data.loaded });
  };

  const submitUploads = async (
    items: UploadItem[],
    emptyDirs: string[] = [],
  ) => {
    clearAndAddHttpError();
    if (items.length === 0 && emptyDirs.length === 0) return;

    // 1. Gather all subdirectories that need to exist on the server
    const dirSet = new Set<string>();

    for (const emptyDir of emptyDirs) {
      const parts = emptyDir.split("/").filter(Boolean);
      for (let i = 1; i <= parts.length; i++) {
        dirSet.add(parts.slice(0, i).join("/"));
      }
    }

    for (const item of items) {
      const parts = item.relativePath.split("/").filter(Boolean);
      for (let i = 1; i < parts.length; i++) {
        dirSet.add(parts.slice(0, i).join("/"));
      }
    }

    // Sort by depth so parent directories are created first
    const sortedDirs = Array.from(dirSet).sort((a, b) => {
      const aDepth = a.split("/").length;
      const bDepth = b.split("/").length;
      return aDepth !== bDepth ? aDepth - bDepth : a.localeCompare(b);
    });

    for (const relDir of sortedDirs) {
      const parts = relDir.split("/").filter(Boolean);
      const dirName = parts[parts.length - 1];
      const parentRel = parts.slice(0, -1).join("/");
      const rootPath = cleanDirectoryPath(join(directory, parentRel));
      try {
        await createDirectory(uuid, rootPath, dirName);
      } catch {
        // Ignore if directory already exists
      }
    }

    if (items.length === 0) {
      mutate();
      return;
    }

    // 2. Queue upload tasks
    const uploads = items.map((item) => {
      const controller = new AbortController();
      const parts = item.relativePath.split("/").filter(Boolean);
      const parentRel = parts.slice(0, -1).join("/");
      const targetDir = cleanDirectoryPath(join(directory, parentRel));

      pushFileUpload({
        name: item.relativePath,
        data: { abort: controller, loaded: 0, total: item.file.size },
      });

      return () =>
        getFileUploadUrl(uuid).then((url) =>
          axios
            .post(
              url,
              { files: item.file },
              {
                signal: controller.signal,
                headers: {
                  "Content-Type": "multipart/form-data",
                },
                params: { directory: targetDir },
                onUploadProgress: (data) =>
                  onUploadProgress(data, item.relativePath),
              },
            )
            .then(() =>
              timeouts.current.push(
                setTimeout(() => removeFileUpload(item.relativePath), 500),
              ),
            ),
        );
    });

    runWithConcurrency(uploads, 5)
      .then(() => mutate())
      .catch((error) => {
        clearFileUploads();
        clearAndAddHttpError(error);
      });
  };

  const handleDrop = async (e: React.DragEvent) => {
    clearAndAddHttpError();
    const items = e.dataTransfer?.items;

    if (items && items.length > 0) {
      const uploadItems: UploadItem[] = [];
      const emptyDirs: string[] = [];
      const entryPromises: Promise<void>[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind !== "file") continue;

        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) {
          entryPromises.push(traverseEntry(entry, "", uploadItems, emptyDirs));
        } else {
          const file = item.getAsFile();
          if (file) {
            uploadItems.push({ file, relativePath: file.name });
          }
        }
      }

      try {
        await Promise.all(entryPromises);
        submitUploads(uploadItems, emptyDirs);
        return;
      } catch (err) {
        clearAndAddHttpError(
          err instanceof Error ? err : new Error(String(err)),
        );
        return;
      }
    }

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const list = Array.from(files).map((file) => ({
        file,
        relativePath: file.webkitRelativePath || file.name,
      }));
      submitUploads(list, []);
    }
  };

  return (
    <>
      <Portal>
        <Fade
          appear
          in={visible}
          timeout={75}
          key={"upload_modal_mask"}
          unmountOnExit
        >
          <ModalMask
            onClick={() => setVisible(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();

              setVisible(false);
              handleDrop(e);
            }}
          >
            <div
              className={
                "pointer-events-none flex w-full items-center justify-center"
              }
            >
              <div
                className={
                  "mx-10 flex w-full max-w-sm items-center space-x-4 rounded bg-black p-6 ring-4 ring-blue-200/60"
                }
              >
                <CloudUpload className={"h-10 w-10 shrink-0"} />
                <p
                  className={
                    "font-header flex-1 text-center text-lg text-neutral-100"
                  }
                >
                  {t(
                    "files.drag_and_drop_to_upload",
                    "Drag and drop files or folders to upload.",
                  )}
                </p>
              </div>
            </div>
          </ModalMask>
        </Fade>
      </Portal>

      <input
        type={"file"}
        ref={fileUploadInput}
        className={"hidden"}
        onChange={(e) => {
          if (!e.currentTarget.files?.length) return;

          const list = Array.from(e.currentTarget.files).map((file) => ({
            file,
            relativePath: file.name,
          }));
          submitUploads(list, []);
          e.currentTarget.value = "";
        }}
        multiple
      />

      <input
        type={"file"}
        ref={folderUploadInput}
        className={"hidden"}
        {...{ webkitdirectory: "", directory: "" }}
        onChange={(e) => {
          if (!e.currentTarget.files?.length) return;

          const list = Array.from(e.currentTarget.files).map((file) => ({
            file,
            relativePath: file.webkitRelativePath || file.name,
          }));
          submitUploads(list, []);
          e.currentTarget.value = "";
        }}
        multiple
      />

      <Menu.Root>
        <Menu.Trigger
          className={clsx(
            "btn btn-primary flex items-center justify-center gap-1.5",
            className,
          )}
        >
          <span>{t("files.upload", "Upload")}</span>
          <ChevronDown className={"h-3.5 w-3.5 opacity-80"} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner
            side={"bottom"}
            align={"end"}
            sideOffset={4}
            className={"z-50"}
          >
            <Menu.Popup
              className={clsx(
                "dropdown-items_container w-44 rounded border border-neutral-700/80 bg-neutral-900 p-1 shadow-lg",
                "transition duration-75 ease-out",
                "data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
              )}
            >
              <Menu.Item
                onClick={() => fileUploadInput.current?.click()}
                className={
                  "flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm text-neutral-200 transition-colors hover:bg-neutral-800 hover:text-white"
                }
              >
                <FileUp className={"h-4 w-4 text-neutral-400"} />
                <span>{t("files.upload_files", "Upload Files")}</span>
              </Menu.Item>
              <Menu.Item
                onClick={() => folderUploadInput.current?.click()}
                className={
                  "flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm text-neutral-200 transition-colors hover:bg-neutral-800 hover:text-white"
                }
              >
                <FolderUp className={"h-4 w-4 text-blue-400"} />
                <span>{t("files.upload_folder", "Upload Folder")}</span>
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </>
  );
};
