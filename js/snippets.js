// Builds Python and CLI snippets for the selected tool.

function pyStr(s) {
  return JSON.stringify(s);
}

function heredoc(text) {
  const delim = text.split("\n").includes("EOF") ? "KT_EOF" : "EOF";
  return `<<'${delim}'\n${text}\n${delim}`;
}

function buildPythonSnippet(tool, state) {
  switch (tool) {
    case "segment":
      return (
        `from khmerthings import break_words\n\n` +
        `text = ${pyStr(state.text)}\n` +
        `words = break_words(text)\n` +
        `print(words)\n`
      );

    case "count":
      return (
        `from khmerthings import analyze\n\n` +
        `text = ${pyStr(state.text)}\n` +
        `result = analyze(text)\n` +
        `print(result)\n`
      );

    case "normalize":
      return (
        `from khmerthings import normalize_text\n\n` +
        `text = ${pyStr(state.text)}\n` +
        `result = normalize_text(text)\n` +
        `print(result)\n`
      );

    default:
      return "";
  }
}

function buildCliSnippet(tool, state) {
  switch (tool) {
    case "segment":
      return `khmerthings segment ${heredoc(state.text)}`;
    case "count":
      return `khmerthings count --json ${heredoc(state.text)}`;
    case "normalize":
      return `khmerthings normalize ${heredoc(state.text)}`;
    default:
      return "";
  }
}
