// Boots Pyodide, installs khmerthings from PyPI, and exposes tiny JSON wrappers.

const KT = {};
window.KT = KT;

KT.ready = false;
KT.wordSources = [];
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
    WORD_SOURCES, __version__, analyze, break_words, load_lexicon,
    mark_boundaries, normalize_text, space_sentences, space_words,
)
from khmerthings.spellcheck import fix_spelling

def _lexicon(includes_json):
    return load_lexicon("words", *json.loads(includes_json))

def demo_meta():
    return json.dumps({
        "version": __version__,
        "wordSources": sorted(set(WORD_SOURCES) - {"words"}),
    }, ensure_ascii=False)

def demo_count(text, includes_json):
    return json.dumps(
        dataclasses.asdict(analyze(text, _lexicon(includes_json))), ensure_ascii=False
    )

def demo_segment(text, includes_json):
    return json.dumps(break_words(text, _lexicon(includes_json)), ensure_ascii=False)

def demo_mark_boundaries(text, includes_json, separator):
    return mark_boundaries(text, separator, _lexicon(includes_json))

def demo_normalize(text, includes_json, only):
    lex = _lexicon(includes_json)
    if only == "words":
        return space_words(fix_spelling(text, lex), lex)
    if only == "sentences":
        return space_sentences(text)
    return normalize_text(text, lex)
`);

    const meta = JSON.parse(pyodide.globals.get("demo_meta")());
    KT.version = meta.version;
    KT.wordSources = meta.wordSources;
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
KT.markBoundaries = async (text, includes, separator) =>
  callPy("demo_mark_boundaries", text, JSON.stringify(includes), separator);
KT.normalize = async (text, includes, only) =>
  callPy("demo_normalize", text, JSON.stringify(includes), only);
