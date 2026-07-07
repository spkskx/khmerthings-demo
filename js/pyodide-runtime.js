// Boots Pyodide, installs khmerthings from PyPI via micropip, and exposes
// a small set of JSON-in/JSON-out wrapper functions under window.KT.

const KT = {};
window.KT = KT;

KT.ready = false;
KT.wordSources = [];       // e.g. ["names", "modern", "variants"]
KT.stopwordCategories = []; // e.g. ["particle", "pronoun", ...]
KT.defaultRemove = [];
KT.version = null;

function setStatus(text, kind) {
  const el = document.getElementById("status-bar");
  el.textContent = text;
  el.className = "status status-" + kind;
}

async function initPyodide() {
  let pyodide;
  document.querySelector(".workspace").classList.add("pyodide-loading");
  try {
    setStatus("Loading Pyodide…", "loading");
    pyodide = await loadPyodide();

    setStatus("Installing khmerthings…", "loading");
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");
    await micropip.install("khmerthings");

    await pyodide.runPythonAsync(`
import dataclasses
import json
from khmerthings import (
    DEFAULT_REMOVE, STOPWORD_CATEGORIES, WORD_SOURCES, __version__,
    analyze, break_words, check_spelling, condense_text, content_words,
    fix_spelling, load_lexicon, mark_boundaries, normalize_text, sort_lines,
)


def _lexicon(includes_json):
    return load_lexicon("words", *json.loads(includes_json))


def demo_meta():
    return json.dumps({
        "version": __version__,
        "wordSources": sorted(set(WORD_SOURCES) - {"words"}),
        "stopwordCategories": sorted(STOPWORD_CATEGORIES),
        "defaultRemove": sorted(DEFAULT_REMOVE),
    }, ensure_ascii=False)


def demo_count(text, includes_json):
    return json.dumps(
        dataclasses.asdict(analyze(text, _lexicon(includes_json))), ensure_ascii=False
    )


def demo_segment(text, includes_json):
    return json.dumps(break_words(text, _lexicon(includes_json)), ensure_ascii=False)


def demo_mark_boundaries(text, includes_json):
    return mark_boundaries(text, "\\u200b", _lexicon(includes_json))


def demo_sort(lines_json, descending):
    lines = json.loads(lines_json)
    return json.dumps(sort_lines(lines, descending=descending), ensure_ascii=False)


def demo_spellcheck(text, includes_json, max_suggestions):
    issues = check_spelling(text, _lexicon(includes_json), max_suggestions=max_suggestions)
    return json.dumps([
        {
            "text": i.text,
            "kind": i.kind.value,
            "start": i.start,
            "end": i.end,
            "suggestions": list(i.suggestions),
        }
        for i in issues
    ], ensure_ascii=False)


def demo_spellfix(text, includes_json):
    return fix_spelling(text, _lexicon(includes_json))


def demo_normalize(text, includes_json):
    return normalize_text(text, _lexicon(includes_json))


def demo_condense(text, includes_json, remove_json, words_mode):
    remove = frozenset(json.loads(remove_json))
    lex = _lexicon(includes_json)
    if words_mode:
        return json.dumps(content_words(text, lex, remove=remove), ensure_ascii=False)
    return condense_text(text, lex, remove=remove)
`);

    const meta = JSON.parse(pyodide.globals.get("demo_meta")());
    KT.version = meta.version;
    KT.wordSources = meta.wordSources;
    KT.stopwordCategories = meta.stopwordCategories;
    KT.defaultRemove = meta.defaultRemove;

    KT._pyodide = pyodide;
    KT.ready = true;
    setStatus("Ready — khmerthings v" + KT.version, "ready");
  } catch (err) {
    console.error(err);
    setStatus("Failed to load: " + (err && err.message ? err.message : err), "error");
  } finally {
    document.querySelector(".workspace").classList.remove("pyodide-loading");
  }
}

function callPy(name, ...args) {
  const fn = KT._pyodide.globals.get(name);
  try {
    return fn(...args);
  } finally {
    fn.destroy();
  }
}

KT.count = async (text, includes) =>
  JSON.parse(callPy("demo_count", text, JSON.stringify(includes)));
KT.segment = async (text, includes) =>
  JSON.parse(callPy("demo_segment", text, JSON.stringify(includes)));
KT.markBoundaries = async (text, includes) =>
  callPy("demo_mark_boundaries", text, JSON.stringify(includes));
KT.sort = async (lines, descending) =>
  JSON.parse(callPy("demo_sort", JSON.stringify(lines), descending));
KT.spellcheck = async (text, includes, maxSuggestions) =>
  JSON.parse(callPy("demo_spellcheck", text, JSON.stringify(includes), maxSuggestions));
KT.spellfix = async (text, includes) => callPy("demo_spellfix", text, JSON.stringify(includes));
KT.normalize = async (text, includes) =>
  callPy("demo_normalize", text, JSON.stringify(includes));
KT.condense = async (text, includes, remove, wordsMode) =>
  callPy(
    "demo_condense",
    text,
    JSON.stringify(includes),
    JSON.stringify(remove),
    wordsMode
  );
KT.condenseWords = async (text, includes, remove) =>
  JSON.parse(
    callPy(
      "demo_condense",
      text,
      JSON.stringify(includes),
      JSON.stringify(remove),
      true
    )
  );
