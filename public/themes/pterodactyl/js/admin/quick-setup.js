(() => {
  const modal = document.getElementById("quickSetupModal");
  if (!modal) return;
  const nodeForm = document.getElementById("quick-node-form");
  const locationForm = document.getElementById("quick-location-form");
  const switchPanel = (location) => {
    if (nodeForm) nodeForm.hidden = location;
    locationForm.hidden = !location;
    document.getElementById("quickSetupTitle").textContent = location
      ? modal.dataset.locationTitle
      : modal.dataset.nodeTitle;
  };
  modal.querySelector("[data-location-panel]")?.addEventListener("click", () => switchPanel(true));
  modal.querySelector("[data-node-panel]")?.addEventListener("click", () => switchPanel(false));
  $(modal).on("show.bs.modal", () => switchPanel(!nodeForm));
  modal.querySelectorAll("[data-quick-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector('[type="submit"]');
      if (button.disabled) return;
      const error = form.querySelector(".quick-setup-error");
      error.hidden = true;
      button.disabled = true;
      try {
        const response = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            Array.isArray(result.errors)
              ? result.errors.map((item) => item.detail).join(" ")
              : modal.dataset.failed,
          );
        const data = result.data;
        if (form.dataset.quickForm === "location") {
          document.querySelectorAll("#pLocationId, .quick-location-select").forEach((select) => {
            select.add(new Option(data.short, data.id, true, true));
            $(select).trigger("change");
          });
          if (nodeForm) switchPanel(false);
          else $(modal).modal("hide");
        } else {
          if (modal.dataset.wizard === "true") {
            window.location.reload();
            return;
          }
          Pterodactyl.nodeData.push(data);
          const select = document.getElementById("pNodeId");
          select.add(new Option(data.text, data.id, true, true));
          $(select).trigger("change");
          const notice = document.getElementById("quick-node-created");
          notice.hidden = false;
          notice.querySelector("a").href = data.configuration_url;
          $(modal).modal("hide");
        }
        form.reset();
      } catch (exception) {
        error.textContent = exception.message || modal.dataset.failed;
        error.hidden = false;
      } finally {
        button.disabled = false;
      }
    });
  });
})();
