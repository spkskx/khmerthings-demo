let activeTool = "segment";

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function activePanel() {
  return document.querySelector(`.tool-panel[data-tool="${activeTool}"]`);
}

function renderSnippets(panel) {
  const tool = panel.dataset.tool;
  const state = readState(tool, panel);
  document.getElementById("python-snippet").textContent = buildPythonSnippet(tool, state);
  document.getElementById("cli-snippet").textContent = buildCliSnippet(tool, state);
}

const debouncedRun = debounce(async (panel) => {
  const tool = panel.dataset.tool;
  clearError(panel);
  try {
    await handlers[tool](panel);
    renderDiagram(panel);
  } catch (err) {
    console.error(err);
    showError(panel, err && err.message ? err.message : String(err));
  }
}, 250);

function onPanelChange(panel) {
  renderSnippets(panel);
  if (KT.ready) debouncedRun(panel);
}

function onToolChange() {
  onPanelChange(activePanel());
}

function setupSidebar() {
  const items = document.querySelectorAll(".tool-item");
  items.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.tool === activeTool) return;
      items.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".tool-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      activeTool = btn.dataset.tool;
      activePanel().classList.add("active");
      onToolChange();
    });
  });
}

function wireReactiveInputs() {
  document.querySelectorAll(".tool-panel").forEach((panel) => {
    panel.querySelectorAll("input, textarea, select").forEach((el) => {
      const evt = el.tagName === "TEXTAREA" || el.type === "number" ? "input" : "change";
      el.addEventListener(evt, () => onPanelChange(panel));
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupSidebar();
  wireReactiveInputs();
  setupCopyButtons();

  initPyodide().then(() => {
    if (KT.ready) onToolChange();
  });
});
