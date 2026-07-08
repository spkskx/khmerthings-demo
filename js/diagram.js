// Static pipeline diagrams per tool, annotated live with data from the
// most recent Pyodide call (panel._lastResult). Pure HTML/CSS, no chart
// library, no images/SVG.

const BASE_STAGES = [
  { label: "NFC normalize" },
  { label: "Cluster segmentation (KCC)" },
  { label: "Lexicon longest-match" },
];

const WORD_COUNT_FIELDS = [
  "total_words",
  "khmer_words",
  "unknown_khmer_words",
  "latin_words",
  "numbers",
  "clusters",
  "khmer_characters",
  "characters",
];

function countZwsp(text) {
  return text ? text.split("​").length - 1 : 0;
}

const DIAGRAM_SPECS = {
  segment(data) {
    if (data && data.mode === "mark") {
      return {
        stages: [
          ...BASE_STAGES,
          { label: "Insert ZWSP at word boundaries", badge: `${countZwsp(data.marked)} boundaries` },
        ],
      };
    }
    return {
      stages: [
        ...BASE_STAGES,
        { label: "Emit word list", badge: data ? `${data.words.length} words` : null },
      ],
    };
  },

  count(data) {
    const result = data && data.result;
    return {
      stages: [
        ...BASE_STAGES,
        {
          label: "Classify & tally tokens",
          grid: result ? WORD_COUNT_FIELDS.map((f) => ({ label: f, value: result[f] })) : null,
        },
      ],
    };
  },

  sort(data) {
    const arrow = data && data.descending ? "▼ descending" : "▲ ascending";
    return {
      stages: [
        { label: "Per-cluster sort key (base, coengs, vowels, signs)" },
        { label: "Sort lines", badge: data ? `${data.lines.length} lines · ${arrow}` : null },
      ],
    };
  },

  spellcheck(data) {
    const issues = data ? data.issues : null;
    const only = data ? data.only : "";
    const variantCount = issues ? issues.filter((i) => i.kind === "variant").length : null;
    const unknownCount = issues ? issues.filter((i) => i.kind === "unknown").length : null;
    const variantBadge = only === "unknown" ? "skipped" : issues ? `${variantCount} found` : null;
    const unknownBadge = only === "variants" ? "skipped" : issues ? `${unknownCount} found` : null;
    return {
      stages: [...BASE_STAGES],
      fork: [
        { label: "Dict lookup (VARIANT)", badge: variantBadge },
        { label: "Edit-distance suggestions (UNKNOWN)", badge: unknownBadge },
      ],
      after: { label: only ? "Report the single kind" : "Merge, sorted by position" },
    };
  },

  spellfix(data) {
    let badge = null;
    if (data) badge = data.text === data.fixed ? "no changes" : "text modified";
    return {
      stages: [
        ...BASE_STAGES,
        { label: "Rewrite VARIANT spans only (UNKNOWN untouched)", badge },
      ],
    };
  },

  normalize(data) {
    const badge = data ? `${countZwsp(data.result)} boundaries spaced` : null;
    const only = data ? data.only : "";
    const wordStages = [
      { label: "fix_spelling (VARIANT rewrite)" },
      { label: "space_words (hidden ZWSP at boundaries)", badge },
    ];
    const sentenceStage = { label: "space_sentences (។ / ៕ spacing)" };
    if (only === "words") {
      return { stages: [...BASE_STAGES, ...wordStages] };
    }
    if (only === "sentences") {
      // Lexicon-free pass — no tokenization stages.
      return { stages: [{ label: "NFC normalize" }, sentenceStage] };
    }
    return { stages: [...BASE_STAGES, ...wordStages, sentenceStage] };
  },

  condense(data) {
    return {
      stages: [...BASE_STAGES],
      fork: [
        { label: "Keep (not in remove set)", badge: data ? `${data.keptCount} kept` : null },
        { label: "Drop (stopword category in remove set)", badge: data ? `${data.removedCount} removed` : null },
      ],
    };
  },

  romanize(data) {
    return {
      stages: [
        ...BASE_STAGES,
        { label: "Exception lexicon, else register/vowel rules" },
        { label: "Emit Latin (phonetic, not reversible)" },
      ],
    };
  },

  numerals(data) {
    const labels = {
      khmer: "Arabic digits → Khmer digits (០–៩)",
      arabic: "Khmer digits → Arabic digits (0–9)",
      words: "Spell numbers in Khmer words (decimal units)",
    };
    const to = data ? data.to : "khmer";
    return { stages: [{ label: labels[to] }] };
  },
};

function stageEl(stage) {
  const div = document.createElement("div");
  div.className = "diagram-stage";
  div.textContent = stage.label;
  if (stage.badge) {
    const badge = document.createElement("span");
    badge.className = "diagram-badge";
    badge.textContent = stage.badge;
    div.appendChild(badge);
  }
  if (stage.grid) {
    const grid = document.createElement("div");
    grid.className = "diagram-grid";
    for (const field of stage.grid) {
      const cell = document.createElement("div");
      cell.className = "diagram-grid-cell";
      cell.innerHTML = `<span class="diagram-grid-label">${field.label}</span><span class="diagram-grid-value">${field.value}</span>`;
      grid.appendChild(cell);
    }
    div.appendChild(grid);
  }
  return div;
}

function arrowEl() {
  const span = document.createElement("span");
  span.className = "diagram-arrow";
  span.textContent = "→";
  return span;
}

function buildDiagramDOM(spec) {
  const wrap = document.createElement("div");
  wrap.className = "diagram-flow";

  spec.stages.forEach((stage, i) => {
    if (i > 0) wrap.appendChild(arrowEl());
    wrap.appendChild(stageEl(stage));
  });

  if (spec.fork) {
    if (spec.stages.length) wrap.appendChild(arrowEl());
    const fork = document.createElement("div");
    fork.className = "diagram-fork";
    for (const branch of spec.fork) {
      const branchEl = document.createElement("div");
      branchEl.className = "diagram-branch";
      branchEl.appendChild(stageEl(branch));
      fork.appendChild(branchEl);
    }
    wrap.appendChild(fork);
    if (spec.after) {
      wrap.appendChild(arrowEl());
      wrap.appendChild(stageEl(spec.after));
    }
  }

  return wrap;
}

function renderDiagram(panel) {
  const tool = panel.dataset.tool;
  const container = panel.querySelector(".diagram");
  const specFn = DIAGRAM_SPECS[tool];
  if (!specFn) return;
  const spec = specFn(panel._lastResult);
  container.innerHTML = "";
  container.appendChild(buildDiagramDOM(spec));
}
