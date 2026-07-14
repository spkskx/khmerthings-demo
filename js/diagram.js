// Static pipeline diagrams, annotated with latest Pyodide result.

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
    return {
      stages: [
        ...BASE_STAGES,
        data && data.mode === "mark"
          ? { label: "Insert separators at word boundaries", badge: `${countZwsp(data.marked)} boundaries` }
          : { label: "Emit word list", badge: data ? `${data.words.length} words` : null },
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

  normalize(data) {
    const badge = data ? `${countZwsp(data.result)} boundaries spaced` : null;
    const only = data ? data.only : "";
    const wordStages = [
      { label: "fix_spelling (known variant rewrite)" },
      { label: "space_words (hidden ZWSP at boundaries)", badge },
    ];
    const sentenceStage = { label: "space_sentences (។ / ៕ spacing)" };
    if (only === "words") return { stages: [...BASE_STAGES, ...wordStages] };
    if (only === "sentences") return { stages: [{ label: "NFC normalize" }, sentenceStage] };
    return { stages: [...BASE_STAGES, ...wordStages, sentenceStage] };
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

function renderDiagram(panel) {
  const specFn = DIAGRAM_SPECS[panel.dataset.tool];
  if (!specFn) return;
  const spec = specFn(panel._lastResult);
  const container = panel.querySelector(".diagram");
  container.innerHTML = "";
  spec.stages.forEach((stage, i) => {
    if (i > 0) container.appendChild(arrowEl());
    container.appendChild(stageEl(stage));
  });
}
