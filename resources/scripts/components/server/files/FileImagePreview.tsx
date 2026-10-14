import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { join } from "pathe";
import { FileObject } from "@/api/server/files/loadDirectory";
import getFileImage from "@/api/server/files/getFileImage";
import getFileDownloadUrl from "@/api/server/files/getFileDownloadUrl";
import { ServerContext } from "@/state/server";
import { Dialog } from "@/components/elements/dialog";
import { Button } from "@/components/elements/button/index";
import Spinner from "@/components/elements/Spinner";
import { bytesToString } from "@/lib/formatters";
import { imageMimeType } from "@/lib/filePreview";
import usePanelTranslation from "@/plugins/usePanelTranslation";

export default ({
  file,
  onClose,
}: {
  file: FileObject;
  onClose: () => void;
}) => {
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const directory = ServerContext.useStoreState(
    (state) => state.files.directory,
  );
  const { t } = usePanelTranslation();
  const [url, setUrl] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  }>();
  const [downloading, setDownloading] = useState(false);
  const mime = imageMimeType(file);
  const path = join(directory, file.name);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setLoading(true);
    setError(false);
    setUrl(undefined);
    setDimensions(undefined);
    if (!mime) {
      setError(true);
      setLoading(false);
      return;
    }
    getFileImage(uuid, path, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        // Only raster image MIME types are used for object URLs, never HTML or SVG.
        objectUrl = URL.createObjectURL(new Blob([blob], { type: mime }));
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [uuid, path, mime]);

  const download = async () => {
    setDownloading(true);
    try {
      const link = await getFileDownloadUrl(uuid, path);
      window.location.assign(link);
    } catch {
      setError(true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={t("files.preview_image", "Image preview")}
      description={file.name}
    >
      <Dialog.Icon type="info" position="title" />
      <div className="relative mt-4 flex min-h-48 items-center justify-center overflow-hidden rounded-lg border border-neutral-700 bg-neutral-950 p-3">
        {loading && !error && <Spinner />}
        {error ? (
          <p
            role="alert"
            className="max-w-sm py-6 text-center text-sm leading-6 text-neutral-300"
          >
            {t(
              "files.image_preview_failed",
              "This image could not be previewed. It may be too large or use an unsupported format. You can still download it.",
            )}
          </p>
        ) : (
          url && (
            <img
              src={url}
              alt={file.name}
              className={
                loading
                  ? "absolute h-px w-px opacity-0"
                  : "max-h-[45vh] max-w-full object-contain"
              }
              onLoad={(event) => {
                setDimensions({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                });
                setLoading(false);
              }}
              onError={() => {
                setError(true);
                setLoading(false);
              }}
            />
          )
        )}
      </div>
      <p className="mt-3 text-sm text-neutral-400">
        {bytesToString(file.size)}
        {dimensions && ` · ${dimensions.width} × ${dimensions.height}`}
      </p>
      <Dialog.Footer>
        <Button.Text onClick={onClose}>
          {t("files.close_preview", "Close")}
        </Button.Text>
        <Button onClick={download} disabled={downloading}>
          <Download size={16} aria-hidden />{" "}
          {t("files.download_image", "Download")}
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
};
