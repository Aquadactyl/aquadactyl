import React from "react";
import { createRoot } from "react-dom/client";
import App from "@/components/App";
import Spinner from "@/components/elements/Spinner";
import { loadInitialRouter } from "@/routers/initialRouter";

// Enable language support.
import "./i18n";

const container = document.getElementById("app");
if (container) {
  const root = createRoot(container);
  root.render(<Spinner centered size="large" />);
  void loadInitialRouter(window.location.pathname).then(
    (initialRouter) => root.render(<App initialRouter={initialRouter} />),
    () => root.render(<App />),
  );
}
