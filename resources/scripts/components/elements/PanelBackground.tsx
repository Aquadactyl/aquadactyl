import React from "react";
import { useLocation } from "react-router";
import { useAppStore } from "@/state";

export default function PanelBackground() {
  const { pathname } = useLocation();
  const appearance = useAppStore((state) => state.settings.data?.appearance);
  const background = pathname.startsWith("/auth/")
    ? appearance?.loginBackground
    : appearance?.clientBackground;
  if (!background?.url) return null;

  const blur = Math.max(0, Math.min(30, background.blur));
  const overlay = Math.max(0, Math.min(95, background.overlay)) / 100;
  return (
    <div
      className="panel-background"
      aria-hidden="true"
      style={{
        inset: -2 * blur,
        filter: `blur(${blur}px)`,
        backgroundImage: `linear-gradient(rgba(12, 17, 22, ${overlay}), rgba(12, 17, 22, ${overlay})), url(${JSON.stringify(background.url)})`,
      }}
    />
  );
}
