import React, { useRef, useState } from "react";
import { Clipboard, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/state";
import { ServerContext } from "@/state/server";
import { Dialog } from "@/components/elements/dialog";
import { Button } from "@/components/elements/button/index";
import CopyOnClick from "@/components/elements/CopyOnClick";
import shareConsoleLogs from "@/api/server/shareConsoleLogs";

export default ({ getLogs }: { getLogs: () => string }) => {
  const enabled = useAppStore(
    (state) => state.settings.data?.features?.consoleLogSharing === true,
  );
  const serverId = ServerContext.useStoreState(
    (state) => state.server.data!.id,
  );
  const { t } = useTranslation("panel");
  const busy = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const [open, setOpen] = useState(false);

  const upload = async () => {
    if (!enabled || busy.current) return;
    const content = getLogs();
    setUrl(undefined);
    setError(undefined);
    if (!content.trim()) {
      setError(
        t("console.share_empty", "There are no console logs to share yet."),
      );
      setOpen(true);
      return;
    }
    busy.current = true;
    setUploading(true);
    try {
      const link = await shareConsoleLogs(serverId, content);
      setUrl(link);
    } catch {
      setError(
        t(
          "console.share_error",
          "Unable to share console logs. Please try again later.",
        ),
      );
    } finally {
      busy.current = false;
      setUploading(false);
      setOpen(true);
    }
  };

  if (!enabled) return null;
  return (
    <>
      <button
        type="button"
        className="hover:bg-primary-500/15 hover:text-primary-300 focus-visible:outline-primary-400 absolute inset-y-1 right-1 flex w-10 items-center justify-center rounded text-gray-300 focus-visible:outline-2 disabled:cursor-wait disabled:opacity-50"
        aria-label={t("console.share_logs", "Share redacted console logs")}
        title={t(
          "console.share_logs_help",
          "Upload redacted console logs to debug.euphoriadevelopment.uk (expires after 24 hours).",
        )}
        aria-busy={uploading}
        disabled={uploading}
        onClick={upload}
      >
        {uploading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Clipboard className="h-4 w-4" aria-hidden />
        )}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("console.share_title", "Console log link")}
        description={
          url
            ? t(
                "console.share_description",
                "Your redacted logs are available for 24 hours. Only you see this link here; anyone you share it with can read the paste. Redaction is best effort: check the paste before sharing it.",
              )
            : undefined
        }
      >
        {error && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}
        {url && (
          <>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-300 block rounded border border-gray-600 bg-gray-900 p-3 break-all underline"
            >
              {url}
            </a>
            <Dialog.Footer>
              <CopyOnClick text={url} showInNotification={false}>
                <Button type="button">
                  {t("console.copy_log_link", "Copy link")}
                </Button>
              </CopyOnClick>
            </Dialog.Footer>
          </>
        )}
      </Dialog>
    </>
  );
};
