// Pure string templating: builds the Python and CLI equivalents of the
// currently configured tool/input/options. No Pyodide involved, so these
// can (and should) be regenerated synchronously on every keystroke.

function pyStr(s) {
  return JSON.stringify(s);
}

function pyListStr(arr) {
  return JSON.stringify(arr);
}

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function includeArgsPy(includes) {
  return includes.length ? `load_lexicon("words", ${includes.map((s) => pyStr(s)).join(", ")})` : null;
}

function heredoc(text) {
  const lines = text.split("\n");
  const delim = lines.includes("EOF") ? "KT_EOF" : "EOF";
  return `<<'${delim}'\n${text}\n${delim}`;
}

// Single-quote a value for a POSIX shell (for CLI flag arguments).
function shQuote(s) {
  return "'" + s.replaceAll("'", "'\\''") + "'";
}

function buildPythonSnippet(tool, state) {
  const lexExpr = includeArgsPy(state.includes || []);
  const lexLine = lexExpr ? `lexicon = ${lexExpr}\n` : "";
  const lexArg = lexExpr ? ", lexicon" : "";

  switch (tool) {
    case "segment": {
      if (state.mode === "mark") {
        const sepPy = state.separator ? pyStr(state.separator) : '"\\u200b"';
        return (
          `from khmerthings import mark_boundaries${lexExpr ? ", load_lexicon" : ""}\n\n` +
          `text = ${pyStr(state.text)}\n` +
          lexLine +
          `marked = mark_boundaries(text, ${sepPy}${lexArg})\n` +
          `print(marked)\n`
        );
      }
      return (
        `from khmerthings import break_words${lexExpr ? ", load_lexicon" : ""}\n\n` +
        `text = ${pyStr(state.text)}\n` +
        lexLine +
        `words = break_words(text${lexArg})\n` +
        `print(words)\n`
      );
    }

    case "count": {
      return (
        `from khmerthings import analyze${lexExpr ? ", load_lexicon" : ""}\n\n` +
        `text = ${pyStr(state.text)}\n` +
        lexLine +
        `result = analyze(text${lexArg})\n` +
        `print(result)\n`
      );
    }

    case "sort": {
      return (
        `from khmerthings import sort_lines\n\n` +
        `lines = ${pyListStr(state.lines)}\n` +
        `result = sort_lines(lines, descending=${state.descending ? "True" : "False"})\n` +
        `print(result)\n`
      );
    }

    case "spellcheck": {
      const fn =
        state.only === "variants"
          ? "check_variants"
          : state.only === "unknown"
            ? "check_unknown"
            : "check_spelling";
      const maxArg = state.only === "variants" ? "" : `, max_suggestions=${state.maxSuggestions}`;
      return (
        `from khmerthings import ${fn}${lexExpr ? ", load_lexicon" : ""}\n\n` +
        `text = ${pyStr(state.text)}\n` +
        lexLine +
        `issues = ${fn}(text${lexArg}${maxArg})\n` +
        `for issue in issues:\n` +
        `    print(issue.kind.value, issue.text, issue.suggestions)\n`
      );
    }

    case "spellfix": {
      return (
        `from khmerthings import fix_spelling${lexExpr ? ", load_lexicon" : ""}\n\n` +
        `text = ${pyStr(state.text)}\n` +
        lexLine +
        `fixed = fix_spelling(text${lexArg})\n` +
        `print(fixed)\n`
      );
    }

    case "normalize": {
      if (state.only === "sentences") {
        // Lexicon-free pass; no lexicon import or argument.
        return (
          `from khmerthings import space_sentences\n\n` +
          `text = ${pyStr(state.text)}\n` +
          `result = space_sentences(text)\n` +
          `print(result)\n`
        );
      }
      if (state.only === "words") {
        return (
          `from khmerthings import fix_spelling, space_words${lexExpr ? ", load_lexicon" : ""}\n\n` +
          `text = ${pyStr(state.text)}\n` +
          lexLine +
          `result = space_words(fix_spelling(text${lexArg})${lexArg})\n` +
          `print(result)\n`
        );
      }
      return (
        `from khmerthings import normalize_text${lexExpr ? ", load_lexicon" : ""}\n\n` +
        `text = ${pyStr(state.text)}\n` +
        lexLine +
        `result = normalize_text(text${lexArg})\n` +
        `print(result)\n`
      );
    }

    case "condense": {
      const fn = state.wordsMode ? "content_words" : "condense_text";
      const isDefault = sameSet(state.remove, KT.defaultRemove || []);
      const removeLine = isDefault ? "" : `remove = frozenset(${pyListStr(state.remove)})\n`;
      const removeArg = isDefault ? "" : ", remove=remove";
      return (
        `from khmerthings import ${fn}${lexExpr ? ", load_lexicon" : ""}\n\n` +
        `text = ${pyStr(state.text)}\n` +
        lexLine +
        removeLine +
        `result = ${fn}(text${lexArg}${removeArg})\n` +
        `print(result)\n`
      );
    }

    case "romanize": {
      return (
        `from khmerthings import romanize${lexExpr ? ", load_lexicon" : ""}\n\n` +
        `text = ${pyStr(state.text)}\n` +
        lexLine +
        `result = romanize(text${lexArg})\n` +
        `print(result)\n`
      );
    }

    case "numerals": {
      if (state.to === "words") {
        return (
          `import re\n` +
          `from khmerthings import khmer_to_arabic, number_to_words\n\n` +
          `text = ${pyStr(state.text)}\n` +
          `result = re.sub(r"[0-9០-៩]+", lambda m: number_to_words(int(khmer_to_arabic(m.group()))), text)\n` +
          `print(result)\n`
        );
      }
      const fn = state.to === "arabic" ? "khmer_to_arabic" : "arabic_to_khmer";
      return (
        `from khmerthings import ${fn}\n\n` +
        `text = ${pyStr(state.text)}\n` +
        `result = ${fn}(text)\n` +
        `print(result)\n`
      );
    }

    default:
      return "";
  }
}

function buildCliSnippet(tool, state) {
  const includeFlag = (state.includes || []).length ? ` --include ${state.includes.join(",")}` : "";

  switch (tool) {
    case "segment": {
      const markFlag = state.mode === "mark" ? " --mark" : "";
      const sepFlag =
        state.mode === "mark" && state.separator ? ` --separator ${shQuote(state.separator)}` : "";
      return `khmerthings segment${markFlag}${sepFlag}${includeFlag} ${heredoc(state.text)}`;
    }

    case "count": {
      return `khmerthings count${includeFlag} --json ${heredoc(state.text)}`;
    }

    case "sort": {
      const descFlag = state.descending ? " --desc" : "";
      return `khmerthings sort${descFlag} ${heredoc(state.lines.join("\n"))}`;
    }

    case "spellcheck": {
      const onlyFlag = state.only ? ` --only ${state.only}` : "";
      const maxFlag =
        state.only === "variants" ? "" : ` --max-suggestions ${state.maxSuggestions}`;
      return `khmerthings spellcheck${includeFlag}${onlyFlag}${maxFlag} --json ${heredoc(state.text)}`;
    }

    case "spellfix": {
      return `khmerthings spellfix${includeFlag} ${heredoc(state.text)}`;
    }

    case "normalize": {
      const onlyFlag = state.only ? ` --only ${state.only}` : "";
      return `khmerthings normalize${includeFlag}${onlyFlag} ${heredoc(state.text)}`;
    }

    case "condense": {
      const isDefault = sameSet(state.remove, KT.defaultRemove || []);
      const removeFlag = isDefault ? "" : ` --remove ${state.remove.join(",")}`;
      const wordsFlag = state.wordsMode ? " --words" : "";
      return `khmerthings condense${removeFlag}${wordsFlag}${includeFlag} ${heredoc(state.text)}`;
    }

    case "romanize": {
      return `khmerthings romanize${includeFlag} ${heredoc(state.text)}`;
    }

    case "numerals": {
      return `khmerthings numerals --to ${state.to} ${heredoc(state.text)}`;
    }

    default:
      return "";
  }
}
