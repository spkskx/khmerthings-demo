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

async function runPanel(panel) {
  if (!KT.ready) {
    showError(panel, "Still loading khmerthings. Try again in a moment.");
    return;
  }
  const tool = panel.dataset.tool;
  clearError(panel);
  try {
    await handlers[tool](panel);
    renderDiagram(panel);
  } catch (err) {
    console.error(err);
    showError(panel, err && err.message ? err.message : String(err));
  }
}

const debouncedRun = debounce(runPanel, 250);

function onPanelChange(panel) {
  renderSnippets(panel);
  debouncedRun(panel);
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
    panel.querySelectorAll("textarea").forEach((el) => {
      el.addEventListener("input", () => onPanelChange(panel));
      el.addEventListener("paste", () => setTimeout(() => onPanelChange(panel)));
    });
    panel.querySelector(".run-btn").addEventListener("click", () => {
      renderSnippets(panel);
      runPanel(panel);
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
