// Builds Python and CLI snippets for current tool/options.

function pyStr(s) {
  return JSON.stringify(s);
}

function includeArgsPy(includes) {
  return includes.length ? `load_lexicon("words", ${includes.map((s) => pyStr(s)).join(", ")})` : null;
}

function heredoc(text) {
  const delim = text.split("\n").includes("EOF") ? "KT_EOF" : "EOF";
  return `<<'${delim}'\n${text}\n${delim}`;
}

function shQuote(s) {
  return "'" + s.replaceAll("'", "'\\''") + "'";
}

function buildPythonSnippet(tool, state) {
  const lexExpr = includeArgsPy(state.includes || []);
  const lexLine = lexExpr ? `lexicon = ${lexExpr}\n` : "";
  const lexArg = lexExpr ? ", lexicon" : "";

  switch (tool) {
    case "segment":
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

    case "count":
      return (
        `from khmerthings import analyze${lexExpr ? ", load_lexicon" : ""}\n\n` +
        `text = ${pyStr(state.text)}\n` +
        lexLine +
        `result = analyze(text${lexArg})\n` +
        `print(result)\n`
      );

    case "normalize":
      if (state.only === "sentences") {
        return (
          `from khmerthings import space_sentences\n\n` +
          `text = ${pyStr(state.text)}\n` +
          `result = space_sentences(text)\n` +
          `print(result)\n`
        );
      }
      if (state.only === "words") {
        return (
          `from khmerthings import space_words${lexExpr ? ", load_lexicon" : ""}\n` +
          `from khmerthings.spellcheck import fix_spelling\n\n` +
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

    default:
      return "";
  }
}

function buildCliSnippet(tool, state) {
  const includeFlag = (state.includes || []).length ? ` --include ${state.includes.join(",")}` : "";

  switch (tool) {
    case "segment": {
      const markFlag = state.mode === "mark" ? " --mark" : "";
      const sepFlag = state.mode === "mark" && state.separator ? ` --separator ${shQuote(state.separator)}` : "";
      return `khmerthings segment${markFlag}${sepFlag}${includeFlag} ${heredoc(state.text)}`;
    }
    case "count":
      return `khmerthings count${includeFlag} --json ${heredoc(state.text)}`;
    case "normalize": {
      const onlyFlag = state.only ? ` --only ${state.only}` : "";
      return `khmerthings normalize${includeFlag}${onlyFlag} ${heredoc(state.text)}`;
    }
    default:
      return "";
  }
}
