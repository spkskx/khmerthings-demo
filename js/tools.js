// Per-tool logic. Reads panel state, calls KT.<tool>, renders result.

function showError(panel, message) {
  const err = panel.querySelector(".error");
  err.textContent = message;
  err.hidden = false;
}

function clearError(panel) {
  const err = panel.querySelector(".error");
  err.hidden = true;
  err.textContent = "";
}


function renderList(container, items) {
  container.innerHTML = "";
  if (items.length === 0) {
    container.textContent = "(empty)";
    return;
  }
  const ul = document.createElement("ul");
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    ul.appendChild(li);
  }
  container.appendChild(ul);
}

function renderTable(container, headers, rows) {
  container.innerHTML = "";
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const h of headers) {
    const th = document.createElement("th");
    th.textContent = h;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const cell of row) {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);
}

function readState(tool, panel) {
  return { text: panel.querySelector(".kt-text").value };
}

const handlers = {
  async segment(panel) {
    const state = readState("segment", panel);
    const words = await KT.segment(state.text, []);
    panel._lastResult = { words };
    renderList(panel.querySelector(".output"), words);
  },

  async count(panel) {
    const state = readState("count", panel);
    const result = await KT.count(state.text, []);
    panel._lastResult = { result };
    renderTable(
      panel.querySelector(".output"),
      ["Field", "Value"],
      Object.entries(result).map(([k, v]) => [k, v])
    );
  },

  async normalize(panel) {
    const state = readState("normalize", panel);
    const result = await KT.normalize(state.text, [], "");
    panel._lastResult = { text: state.text, result };
    const output = panel.querySelector(".output");
    output.innerHTML = "";
    const pre = document.createElement("pre");
    pre.className = "kt-text-output";
    pre.textContent = result;
    output.appendChild(pre);
  },
};

function getCopyText(container) {
  const table = container.querySelector(":scope > table");
  if (table) {
    return Array.from(table.querySelectorAll("tr"))
      .map((tr) => Array.from(tr.children).map((c) => c.textContent).join("\t"))
      .join("\n");
  }
  const ul = container.querySelector(":scope > ul");
  if (ul) return Array.from(ul.children).map((li) => li.textContent).join("\n");
  return container.textContent;
}

async function copyToClipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const original = button.dataset.originalLabel || button.textContent;
    button.dataset.originalLabel = original;
    button.textContent = "Copied!";
    button.classList.add("copied");
    clearTimeout(button._copyTimer);
    button._copyTimer = setTimeout(() => {
      button.textContent = original;
      button.classList.remove("copied");
    }, 1500);
  } catch {
    button.textContent = "Copy failed";
    setTimeout(() => (button.textContent = "Copy"), 1500);
  }
}

function setupCopyButtons() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".copy-btn");
    if (!btn) return;
    const targetId = btn.dataset.copyTarget;
    const text = targetId === "output"
      ? getCopyText(btn.closest(".output-section").querySelector(".output"))
      : document.getElementById(targetId).textContent;
    copyToClipboard(text, btn);
  });
}
