function setupTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tool-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.panel).classList.add("active");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  wireRunButtons();
  document.querySelectorAll("button.run").forEach((b) => (b.disabled = true));

  initPyodide().then(() => {
    if (KT.ready) populateDynamicControls();
  });
});
