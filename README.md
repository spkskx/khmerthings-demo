# khmerthings-demo

Interactive browser demo of all 9 [khmerthings](https://github.com/spkskx/khmerthings)
tools — word breaker, word counter, line sorter, spellchecker, spellfixer,
normalizer, condenser, romanizer, and numerals — running as real Python in
your browser, no server involved.

Live: https://spkskx.github.io/khmerthings-demo/

## How it works

khmerthings is pure Python, stdlib-only, and has zero runtime dependencies,
so it runs unmodified inside [Pyodide](https://pyodide.org/) (CPython
compiled to WebAssembly). The page loads Pyodide from a CDN, uses `micropip`
to `pip install khmerthings` straight from PyPI, and calls the real library
functions directly from JavaScript. There is no backend, no build step, and
no bundler — just static HTML/CSS/JS.

## Run locally

```sh
python -m http.server
```

Then open `http://localhost:8000`. Pyodide requires the page be served over
`http://` or `https://` — opening `index.html` directly via `file://` will
not work due to browser module/CORS restrictions.

## Deploy

Hosted via GitHub Pages, configured in this repo's Settings → Pages
("Deploy from a branch", `main` / root) — no GitHub Actions workflow needed
since there's no build step.

## License

MIT, matching the [khmerthings](https://github.com/spkskx/khmerthings) library.
