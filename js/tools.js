// Per-tool logic: reads panel state, calls the matching KT.<tool>
// function, renders the result, and stores panel._lastResult for the
// diagram renderer. Also populates the dynamic checkbox groups
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

// Reads a tool panel's current option/input values into a plain object.
// Shared by the handlers (to run the tool) and snippets.js (to render the
// equivalent Python/CLI code) so there's one source of truth per tool.
function readState(tool, panel) {
  const text = panel.querySelector(".kt-text").value;
  const includes = selectedIncludes(panel);
  switch (tool) {
    case "segment":
      return {
        text,
        includes,
        mode: panel.querySelector("input[name=segment-mode]:checked").value,
        separator: panel.querySelector(".sep-input").value,
      };
    case "count":
      return { text, includes };
    case "sort":
      return {
        lines: text.split("\n"),
        descending: panel.querySelector(".sort-desc").checked,
      };
    case "spellcheck":
      return {
        text,
        includes,
        maxSuggestions: parseInt(panel.querySelector(".max-suggestions").value, 10) || 0,
        only: panel.querySelector(".only-select").value,
      };
    case "spellfix":
      return { text, includes };
    case "normalize":
      return { text, includes, only: panel.querySelector(".only-select").value };
    case "condense":
      return {
        text,
        includes,
        remove: Array.from(
          panel.querySelectorAll(".remove-group input[type=checkbox]:checked")
        ).map((cb) => cb.value),
        wordsMode: panel.querySelector("input[name=condense-mode]:checked").value === "words",
      };
    case "romanize":
      return { text, includes };
    case "numerals":
      return { text, to: panel.querySelector(".to-select").value };
    default:
      return { text, includes };
  }
}

const handlers = {
  async segment(panel) {
    const state = readState("segment", panel);
    const output = panel.querySelector(".output");
    const revealToggle = panel.querySelector(".reveal-toggle");
    const sepToggle = panel.querySelector(".sep-toggle");
    if (state.mode === "mark") {
      revealToggle.hidden = false;
      sepToggle.hidden = false;
      // Empty input means the CLI/library default word delimiter (ZWSP).
      const separator = state.separator || "​";
      const marked = await KT.markBoundaries(state.text, state.includes, separator);
      panel._lastResult = { mode: "mark", marked };
      const reveal = revealToggle.querySelector(".reveal-seps").checked;
      output.innerHTML = "";
      const pre = document.createElement("pre");
      pre.className = "kt-text-output";
      pre.textContent = revealSeparators(marked, reveal);
      output.appendChild(pre);
    } else {
      revealToggle.hidden = true;
      sepToggle.hidden = true;
      const words = await KT.segment(state.text, state.includes);
      panel._lastResult = { mode: "list", words };
      renderList(output, words);
    }
  },

  async count(panel) {
    const state = readState("count", panel);
    const result = await KT.count(state.text, state.includes);
    panel._lastResult = { result };
    const output = panel.querySelector(".output");
    renderTable(
      output,
      ["Field", "Value"],
      Object.entries(result).map(([k, v]) => [k, v])
    );
  },

  async sort(panel) {
    const state = readState("sort", panel);
    const result = await KT.sort(state.lines, state.descending);
    panel._lastResult = { lines: state.lines, result, descending: state.descending };
    renderList(panel.querySelector(".output"), result);
  },

  async spellcheck(panel) {
    const state = readState("spellcheck", panel);
    const issues = await KT.spellcheck(state.text, state.includes, state.maxSuggestions, state.only);
    panel._lastResult = { issues, only: state.only };
    renderTable(
      panel.querySelector(".output"),
      ["text", "kind", "start", "end", "suggestions"],
      issues.map((i) => [i.text, i.kind, i.start, i.end, i.suggestions.join(", ")])
    );
  },

  async spellfix(panel) {
    const state = readState("spellfix", panel);
    const fixed = await KT.spellfix(state.text, state.includes);
    panel._lastResult = { text: state.text, fixed };
    const output = panel.querySelector(".output");
    output.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "before-after";
    wrap.innerHTML =
      '<div><h4>Original</h4><pre class="kt-text-output"></pre></div>' +
      '<div><h4>Fixed</h4><pre class="kt-text-output"></pre></div>';
    wrap.querySelectorAll("pre")[0].textContent = state.text;
    wrap.querySelectorAll("pre")[1].textContent = fixed;
    output.appendChild(wrap);
  },

  async normalize(panel) {
    const state = readState("normalize", panel);
    const result = await KT.normalize(state.text, state.includes, state.only);
    panel._lastResult = { text: state.text, result, only: state.only };
    const reveal = panel.querySelector(".reveal-seps").checked;
    const output = panel.querySelector(".output");
    output.innerHTML = "";
    const pre = document.createElement("pre");
    pre.className = "kt-text-output";
    pre.textContent = revealSeparators(result, reveal);
    output.appendChild(pre);
  },

  async condense(panel) {
    const state = readState("condense", panel);
    const output = panel.querySelector(".output");
    const kept = await KT.condenseWords(state.text, state.includes, state.remove);
    const totalWords = (await KT.segment(state.text, state.includes)).length;
    panel._lastResult = {
      wordsMode: state.wordsMode,
      kept,
      keptCount: kept.length,
      totalWords,
      removedCount: totalWords - kept.length,
    };
    if (state.wordsMode) {
      renderList(output, kept);
    } else {
      const result = await KT.condense(state.text, state.includes, state.remove, false);
      output.innerHTML = "";
      const pre = document.createElement("pre");
      pre.className = "kt-text-output";
      pre.textContent = result;
      output.appendChild(pre);
    }
  },

  async romanize(panel) {
    const state = readState("romanize", panel);
    const result = await KT.romanize(state.text, state.includes);
    panel._lastResult = { text: state.text, result };
    const output = panel.querySelector(".output");
    output.innerHTML = "";
    const pre = document.createElement("pre");
    pre.className = "kt-text-output";
    pre.textContent = result;
    output.appendChild(pre);
  },

  async numerals(panel) {
    const state = readState("numerals", panel);
    const result = await KT.numerals(state.text, state.to);
    panel._lastResult = { text: state.text, to: state.to, result };
    const output = panel.querySelector(".output");
    output.innerHTML = "";
    const pre = document.createElement("pre");
    pre.className = "kt-text-output";
    pre.textContent = result;
    output.appendChild(pre);
  },
};

function populateDynamicControls() {
  document.querySelectorAll(".include-group[data-includes]").forEach((group) => {
    const panel = group.closest(".tool-panel");
    group.innerHTML = "";
    for (const source of KT.wordSources) {
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = source;
      cb.addEventListener("change", () => onPanelChange(panel));
      label.appendChild(cb);
      label.append(" " + source);
      group.appendChild(label);
    }
  });

  const catGroup = document.querySelector(".remove-group [data-categories]");
  if (catGroup) {
    const panel = catGroup.closest(".tool-panel");
    catGroup.innerHTML = "";
    for (const cat of KT.stopwordCategories) {
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = cat;
      cb.checked = KT.defaultRemove.includes(cat);
      cb.addEventListener("change", () => onPanelChange(panel));
      label.appendChild(cb);
      label.append(" " + cat);
      catGroup.appendChild(label);
    }
  }
}

// Plain textContent concatenates table/list cells with no separator
// (e.g. "total_words8khmer_words4..."), which defeats the point of a
// copy-for-reuse button. Reconstruct readable plain text for the shapes
// the output area can take.
function getCopyText(container) {
  const table = container.querySelector(":scope > table");
  if (table) {
    return Array.from(table.querySelectorAll("tr"))
      .map((tr) => Array.from(tr.children).map((c) => c.textContent).join("\t"))
      .join("\n");
  }
  const ul = container.querySelector(":scope > ul");
  if (ul) {
    return Array.from(ul.children).map((li) => li.textContent).join("\n");
  }
  const beforeAfter = container.querySelector(":scope > .before-after");
  if (beforeAfter) {
    const pres = beforeAfter.querySelectorAll("pre");
    return `Original: ${pres[0].textContent}\nFixed: ${pres[1].textContent}`;
  }
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
  } catch (err) {
    console.error("clipboard write failed", err);
    button.textContent = "Copy failed";
    setTimeout(() => (button.textContent = "Copy"), 1500);
  }
}

function setupCopyButtons() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".copy-btn");
    if (!btn) return;
    const targetId = btn.dataset.copyTarget;
    let text;
    if (targetId === "output") {
      text = getCopyText(btn.closest(".output-section").querySelector(".output"));
    } else {
      text = document.getElementById(targetId).textContent;
    }
    copyToClipboard(text, btn);
  });
}
