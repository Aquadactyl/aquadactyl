import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";
import { useAppStore } from "@/state";
import { FlashMessage } from "@/state/flashes";
import usePanelTranslation from "@/plugins/usePanelTranslation";

const icons = {
  success: CheckCircle2,
  info: Info,
  warning: TriangleAlert,
  error: CircleAlert,
};

export const Toast = ({
  message,
  dismiss,
}: {
  message: FlashMessage;
  dismiss: (id: string) => void;
}) => {
  const { t } = usePanelTranslation();
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || message.type === "error") return;
    const timer = setTimeout(() => dismiss(message.id!), 7000);
    return () => clearTimeout(timer);
  }, [message.id, message.type, paused, dismiss]);
  const Icon = icons[message.type];
  return (
    <div
      className="panel-toast"
      data-type={message.type}
      role={message.type === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon size={20} className="panel-toast-icon" aria-hidden />
      <div className="panel-toast-copy">
        {message.title && <strong>{message.title}</strong>}
        <p>{message.message}</p>
      </div>
      <button
        type="button"
        onClick={() => dismiss(message.id!)}
        aria-label={t("notifications.dismiss", "Dismiss notification")}
      >
        <X size={17} aria-hidden />
      </button>
    </div>
  );
};

export default function ToastHost() {
  const toasts = useAppStore((state) => state.flashes.toasts);
  const dismiss = useAppStore((state) => state.flashes.dismissToast);
  return (
    <div className="panel-toasts" aria-live="polite">
      {toasts.map((message) => (
        <Toast key={message.id} message={message} dismiss={dismiss} />
      ))}
    </div>
  );
}
