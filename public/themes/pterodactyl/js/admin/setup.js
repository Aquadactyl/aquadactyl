(() => {
  const wizard = document.getElementById("setup-wizard");
  if (!wizard) return;
  const color = document.getElementById("setup-color");
  color?.addEventListener("input", () => {
    wizard.querySelector('output[for="setup-color"]').textContent = color.value;
  });
  const logo = document.getElementById("setup-logo");
  const image = document.getElementById("setup-logo-preview");
  const initialLogo = image?.src;
  let preview;
  logo?.addEventListener("change", () => {
    if (preview) URL.revokeObjectURL(preview);
    image.src = initialLogo;
    const file = logo.files[0];
    if (!file || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) return;
    preview = URL.createObjectURL(file);
    image.src = preview;
  });
  // Keep validation errors visible when returning to the additional-admin form.
  if (document.querySelector('.panel-toast[data-type="danger"]')) {
    const details = wizard.querySelector("details");
    if (details) details.open = true;
  }
  const node = document.getElementById("setup-node");
  const config = document.getElementById("setup-node-config");
  const button = document.getElementById("setup-test-node");
  const result = document.getElementById("setup-connection-result");
  node?.addEventListener("change", () => {
    config.href = node.selectedOptions[0].dataset.configUrl;
    result.textContent = "";
    delete result.dataset.connected;
  });
  button?.addEventListener("click", async () => {
    if (button.disabled) return;
    button.disabled = true;
    node.disabled = true;
    result.textContent = button.dataset.testing;
    delete result.dataset.connected;
    try {
      const response = await fetch(node.selectedOptions[0].dataset.testUrl, {
        method: "POST",
        headers: { Accept: "application/json", "X-CSRF-TOKEN": document.querySelector('meta[name="_token"]').content },
        credentials: "same-origin",
        redirect: "error",
      });
      const data = await response.json();
      if (!response.ok || data.connected !== true) throw new Error();
      result.textContent = data.message + " (" + data.version + ")";
      result.dataset.connected = "true";
    } catch {
      result.textContent = button.dataset.failed;
      result.dataset.connected = "false";
    } finally {
      button.disabled = false;
      node.disabled = false;
    }
  });
})();
