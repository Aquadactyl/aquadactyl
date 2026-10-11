import usePanelTranslation from "@/plugins/usePanelTranslation";
import React, { useState } from "react";
import { Search } from "lucide-react";
import useEventListener from "@/plugins/useEventListener";
import SearchModal from "@/components/dashboard/search/SearchModal";
import Tooltip from "@/components/elements/tooltip/Tooltip";

export default () => {
  const { t } = usePanelTranslation();
  const [visible, setVisible] = useState(false);

  useEventListener("keydown", (e: KeyboardEvent) => {
    if (
      ["input", "textarea"].indexOf(
        ((e.target as HTMLElement).tagName || "input").toLowerCase(),
      ) < 0
    ) {
      if (!visible && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "/") {
        e.preventDefault();
        setVisible(true);
      }
    }
  });

  return (
    <>
      {visible && (
        <SearchModal
          appear
          visible={visible}
          onDismissed={() => setVisible(false)}
        />
      )}
      <Tooltip placement={"bottom"} content={t("search.search", "Search")}>
        <button
          type={"button"}
          className={"navigation-link"}
          aria-label={t("search.search", "Search")}
          onClick={() => setVisible(true)}
        >
          <Search size={17} aria-hidden />
          <span className={"navigation-search-label"}>
            {t("search.search", "Search")}
          </span>
        </button>
      </Tooltip>
    </>
  );
};
