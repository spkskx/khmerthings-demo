// Per-tool UI wiring: reads panel inputs, calls the matching KT.<tool>
// function, and renders the result. Populates the dynamic checkbox groups
// (include-sources, stopword categories) once KT is ready.

function panelOf(button) {
  return button.closest(".tool-panel");
}

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

function selectedIncludes(panel) {
  const group = panel.querySelector(".include-group");
  if (!group) return [];
  return Array.from(group.querySelectorAll("input[type=checkbox]:checked")).map(
    (cb) => cb.value
  );
}

function revealSeparators(text, on) {
  return on ? text.replaceAll("​", "·") : text;
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
  if (rows.length === 0) {
    container.textContent = "No issues found.";
    return;
  }
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

function populateDynamicControls() {
  document.querySelectorAll(".include-group[data-includes]").forEach((group) => {
    group.innerHTML = "";
    for (const source of KT.wordSources) {
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = source;
      label.appendChild(cb);
      label.append(" " + source);
      group.appendChild(label);
    }
  });

  const catGroup = document.querySelector(".remove-group [data-categories]");
  if (catGroup) {
    catGroup.innerHTML = "";
    for (const cat of KT.stopwordCategories) {
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = cat;
      cb.checked = KT.defaultRemove.includes(cat);
      label.appendChild(cb);
      label.append(" " + cat);
      catGroup.appendChild(label);
    }
  }
}

const handlers = {
  async segment(panel) {
    const text = panel.querySelector(".kt-text").value;
    const includes = selectedIncludes(panel);
    const mode = panel.querySelector("input[name=segment-mode]:checked").value;
    const output = panel.querySelector(".output");
    const revealToggle = panel.querySelector(".reveal-toggle");
    if (mode === "mark") {
      revealToggle.hidden = false;
      const marked = await KT.markBoundaries(text, includes);
      const reveal = revealToggle.querySelector(".reveal-seps").checked;
      output.innerHTML = "";
      const pre = document.createElement("pre");
      pre.className = "kt-text-output";
      pre.textContent = revealSeparators(marked, reveal);
      output.appendChild(pre);
    } else {
      revealToggle.hidden = true;
      const words = await KT.segment(text, includes);
      renderList(output, words);
    }
  },

  async count(panel) {
    const text = panel.querySelector(".kt-text").value;
    const includes = selectedIncludes(panel);
    const result = await KT.count(text, includes);
    const output = panel.querySelector(".output");
    renderTable(
      output,
      ["Field", "Value"],
      Object.entries(result).map(([k, v]) => [k, v])
    );
  },

  async sort(panel) {
    const text = panel.querySelector(".kt-text").value;
    const lines = text.split("\n");
    const descending = panel.querySelector(".sort-desc").checked;
    const result = await KT.sort(lines, descending);
    renderList(panel.querySelector(".output"), result);
  },

  async spellcheck(panel) {
    const text = panel.querySelector(".kt-text").value;
    const includes = selectedIncludes(panel);
    const maxSuggestions = parseInt(panel.querySelector(".max-suggestions").value, 10) || 0;
    const issues = await KT.spellcheck(text, includes, maxSuggestions);
    renderTable(
      panel.querySelector(".output"),
      ["text", "kind", "start", "end", "suggestions"],
      issues.map((i) => [i.text, i.kind, i.start, i.end, i.suggestions.join(", ")])
    );
  },

  async spellfix(panel) {
    const text = panel.querySelector(".kt-text").value;
    const includes = selectedIncludes(panel);
    const fixed = await KT.spellfix(text, includes);
    const output = panel.querySelector(".output");
    output.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "before-after";
    wrap.innerHTML =
      '<div><h4>Original</h4><pre class="kt-text-output"></pre></div>' +
      '<div><h4>Fixed</h4><pre class="kt-text-output"></pre></div>';
    wrap.querySelectorAll("pre")[0].textContent = text;
    wrap.querySelectorAll("pre")[1].textContent = fixed;
    output.appendChild(wrap);
  },

  async normalize(panel) {
    const text = panel.querySelector(".kt-text").value;
    const includes = selectedIncludes(panel);
    const result = await KT.normalize(text, includes);
    const reveal = panel.querySelector(".reveal-seps").checked;
    const output = panel.querySelector(".output");
    output.innerHTML = "";
    const pre = document.createElement("pre");
    pre.className = "kt-text-output";
    pre.textContent = revealSeparators(result, reveal);
    output.appendChild(pre);
  },

  async condense(panel) {
    const text = panel.querySelector(".kt-text").value;
    const includes = selectedIncludes(panel);
    const remove = Array.from(
      panel.querySelectorAll(".remove-group input[type=checkbox]:checked")
    ).map((cb) => cb.value);
    const wordsMode = panel.querySelector("input[name=condense-mode]:checked").value === "words";
    const output = panel.querySelector(".output");
    if (wordsMode) {
      const words = await KT.condenseWords(text, includes, remove);
      renderList(output, words);
    } else {
      const result = await KT.condense(text, includes, remove, false);
      output.innerHTML = "";
      const pre = document.createElement("pre");
      pre.className = "kt-text-output";
      pre.textContent = result;
      output.appendChild(pre);
    }
  },
};

function wireRunButtons() {
  document.querySelectorAll("button.run").forEach((button) => {
    button.addEventListener("click", async () => {
      const panel = panelOf(button);
      const tool = button.dataset.tool;
      clearError(panel);
      try {
        await handlers[tool](panel);
      } catch (err) {
        console.error(err);
        showError(panel, err && err.message ? err.message : String(err));
      }
    });
  });
}
