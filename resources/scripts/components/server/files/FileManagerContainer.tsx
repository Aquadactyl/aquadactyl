import usePanelTranslation from "@/plugins/usePanelTranslation";
import React, {
  useEffect,
  useMemo,
  useDeferredValue,
  startTransition,
  useRef,
  useState,
} from "react";
import { httpErrorToHuman } from "@/api/http";
import Fade from "@/components/elements/Fade";
import Spinner from "@/components/elements/Spinner";
import FileObjectRow from "@/components/server/files/FileObjectRow";
import FileManagerBreadcrumbs from "@/components/server/files/FileManagerBreadcrumbs";
import { FileObject } from "@/api/server/files/loadDirectory";
import NewDirectoryButton from "@/components/server/files/NewDirectoryButton";
import { NavLink, useLocation } from "react-router";
import Can from "@/components/elements/Can";
import { ServerError } from "@/components/elements/ScreenBlock";
import { Button } from "@/components/elements/button/index";
import { ServerContext } from "@/state/server";
import useFileManagerQuery from "@/plugins/useFileManagerQuery";
import FileManagerStatus from "@/components/server/files/FileManagerStatus";
import MassActionsBar from "@/components/server/files/MassActionsBar";
import UploadButton from "@/components/server/files/UploadButton";
import ServerContentBlock from "@/components/elements/ServerContentBlock";
import useFlash from "@/plugins/useFlash";
import ErrorBoundary from "@/components/elements/ErrorBoundary";
import { FileActionCheckbox } from "@/components/server/files/SelectFileCheckbox";
import { hashToPath } from "@/helpers";
import { Search, X, Trash2 } from "lucide-react";
import { useAppStore } from "@/state";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

import BeforeContent from "@blueprint/components/Server/Files/Browse/BeforeContent";
import FileButtons from "@blueprint/components/Server/Files/Browse/FileButtons";
import AfterContent from "@blueprint/components/Server/Files/Browse/AfterContent";

const sortFiles = (files: FileObject[]): FileObject[] => {
  const copied = [...files];
  copied.sort((a, b) => a.name.localeCompare(b.name));
  copied.sort((a, b) => (a.isFile === b.isFile ? 0 : a.isFile ? 1 : -1));
  return copied.filter(
    (file, index) => index === 0 || file.name !== copied[index - 1].name,
  );
};

export default () => {
  const { t } = usePanelTranslation();
  const trashEnabled = useAppStore(
    (state) => state.settings.data?.features?.fileTrash === true,
  );
  const id = ServerContext.useStoreState((state) => state.server.data!.id);
  const { hash } = useLocation();
  const { data: files, error, mutate } = useFileManagerQuery();
  const directory = ServerContext.useStoreState(
    (state) => state.files.directory,
  );
  const { clearFlashes } = useFlash();
  const setDirectory = ServerContext.useStoreActions(
    (actions) => actions.files.setDirectory,
  );

  const setSelectedFiles = ServerContext.useStoreActions(
    (actions) => actions.files.setSelectedFiles,
  );
  const selectedFilesLength = ServerContext.useStoreState(
    (state) => state.files.selectedFiles.length,
  );

  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filesCount = useMemo(() => {
    if (!files) return undefined;
    let fileCount = 0;
    let folderCount = 0;
    for (const f of files) {
      if (f.isFile) fileCount++;
      else folderCount++;
    }
    return { files: fileCount, folders: folderCount };
  }, [files]);

  const filteredFiles = useMemo(() => {
    if (!files) return null;
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed) {
      return sortFiles(files);
    }
    const terms = trimmed.split(/\s+/);
    return sortFiles(
      files.filter((file) =>
        terms.every((term) => file.name.toLowerCase().includes(term)),
      ),
    );
  }, [files, searchTerm]);

  const deferredFilteredFiles = useDeferredValue(filteredFiles);

  const rowVirtualizer = useWindowVirtualizer({
    count: deferredFilteredFiles?.length ?? 0,
    estimateSize: () => 41,
    overscan: 12,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes(
          (e.target as HTMLElement)?.tagName || "",
        )
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    clearFlashes("files");
    setSelectedFiles([]);
    setSearchTerm("");
    startTransition(() => {
      setDirectory(hashToPath(hash));
    });
  }, [hash]);

  useEffect(() => {
    mutate();
  }, [directory]);

  if (error) {
    return (
      <ServerError message={httpErrorToHuman(error)} onRetry={() => mutate()} />
    );
  }

  return (
    <ServerContentBlock
      title={t("files.file_manager", "File Manager")}
      showFlashKey={"files"}
    >
      <ErrorBoundary>
        <BeforeContent />
        {files && (
          <div className={"mb-4 w-full"}>
            <div className={"relative flex w-full items-center"}>
              <Search
                className={
                  "pointer-events-none absolute left-3 text-neutral-400"
                }
                size={16}
                aria-hidden
              />
              <input
                ref={searchInputRef}
                type={"search"}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchTerm("");
                    searchInputRef.current?.blur();
                  }
                }}
                placeholder={t(
                  "files.search_files_placeholder",
                  "Search files… (Press '/' to focus)",
                )}
                className={
                  "w-full rounded border border-neutral-700 bg-neutral-900/80 py-2 pr-9 pl-9 text-sm text-neutral-200 placeholder-neutral-500 transition-colors focus:border-blue-500 focus:bg-neutral-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                }
                aria-label={t("files.search_files", "Search files…")}
              />
              {searchTerm && (
                <button
                  type={"button"}
                  onClick={() => {
                    setSearchTerm("");
                    searchInputRef.current?.focus();
                  }}
                  className={
                    "absolute right-2.5 text-neutral-400 transition-colors hover:text-neutral-200"
                  }
                  aria-label={t("files.clear_search", "Clear search")}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        )}

        <div
          className={
            "mb-4 flex flex-wrap-reverse items-center justify-between gap-4 md:flex-nowrap"
          }
        >
          <FileManagerBreadcrumbs
            filesCount={filesCount}
            renderLeft={
              <FileActionCheckbox
                className={"mx-4"}
                checked={
                  selectedFilesLength > 0 &&
                  selectedFilesLength ===
                    (deferredFilteredFiles?.length === 0
                      ? -1
                      : deferredFilteredFiles?.length)
                }
                indeterminate={
                  selectedFilesLength > 0 &&
                  selectedFilesLength !==
                    (deferredFilteredFiles?.length === 0
                      ? -1
                      : deferredFilteredFiles?.length)
                }
                onCheckedChange={(checked) => {
                  setSelectedFiles(
                    checked
                      ? (deferredFilteredFiles || []).map((file) => file.name)
                      : [],
                  );
                }}
              />
            }
          />
          <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:justify-end">
            {trashEnabled && (
              <Can action="file.read">
                <NavLink to={`/server/${id}/trash`}>
                  <Button variant={Button.Variants.Secondary}>
                    <Trash2 className="mr-2 inline h-4 w-4" aria-hidden />
                    {t("trash.title", "Trash")}
                  </Button>
                </NavLink>
              </Can>
            )}
            <Can action={"file.create"}>
              <div className={"manager_actions"}>
                <FileManagerStatus />
                <FileButtons />
                <NewDirectoryButton />
                <UploadButton />
                <NavLink to={`/server/${id}/files/new${window.location.hash}`}>
                  <Button>{t("files.new_file", "New File")}</Button>
                </NavLink>
              </div>
            </Can>
          </div>
        </div>
      </ErrorBoundary>
      {!files ? (
        <Spinner size={"large"} centered />
      ) : (
        <>
          {!files.length ? (
            <p className={"text-center text-sm text-neutral-400"}>
              {t(
                "files.this_directory_seems_to_be_empty",
                "This directory seems to be empty.",
              )}
            </p>
          ) : (
            <Fade timeout={150}>
              <div>
                {!deferredFilteredFiles?.length ? (
                  <div className={"py-12 text-center"}>
                    <p className={"mb-3 text-sm text-neutral-400"}>
                      {t(
                        "files.no_matching_files",
                        'No files or directories matching "{{query}}".',
                        { query: searchTerm },
                      )}
                    </p>
                    <Button
                      variant={Button.Variants.Secondary}
                      size={Button.Sizes.Small}
                      onClick={() => setSearchTerm("")}
                    >
                      {t("files.clear_search", "Clear search")}
                    </Button>
                  </div>
                ) : (
                  <div ref={listRef}>
                    <div
                      style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: "100%",
                        position: "relative",
                      }}
                    >
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const file = deferredFilteredFiles[virtualRow.index];
                        return (
                          <div
                            key={file.key}
                            data-index={virtualRow.index}
                            ref={rowVirtualizer.measureElement}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              transform: `translateY(${virtualRow.start - (rowVirtualizer.options.scrollMargin ?? 0)}px)`,
                            }}
                          >
                            <FileObjectRow file={file} />
                          </div>
                        );
                      })}
                    </div>
                    <MassActionsBar />
                  </div>
                )}
              </div>
            </Fade>
          )}
        </>
      )}
      <AfterContent />
    </ServerContentBlock>
  );
};
