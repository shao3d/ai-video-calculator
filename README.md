# AI Video Calculator

Interactive pricing calculator for AI video production — a single self-contained static page.
Visitors answer eight blocks of questions and the estimate recalculates instantly.

**Live:** https://shao3d.github.io/ai-video-calculator/

## What it does

* 8-step question flow: purpose and runtime → quality level → script/scenes/world → complex scenes → hybrid production → sound and graphics → timeline and rights → free-form brief.
* Live estimate in a sticky panel: minimum budget, realistic budget, working days, number of AI generations, price per minute, and a full line-by-line breakdown by production stage.
* Two toggle-driven behaviours worth knowing: the *purpose* switch silently rewrites the level and several other answers (a trailer preset, a gift preset, an IP preset), and the *complex scene* checkboxes feed generation attempts and post-production load.
* Answers persist in `localStorage`, and the brief can be copied to the clipboard as plain text.

## Tech

Plain HTML, CSS and vanilla JS in one `index.html` — no build step, no dependencies.
Fonts are loaded from Google Fonts (`Unbounded`, `Onest`).
Light and dark themes via `prefers-color-scheme`.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Verify the pricing numbers

The pricing engine (`estimate()`) is a pure function with no DOM access, so it can be lifted
out of the page and tested directly:

```bash
node tools/extract-engine.cjs index.html /tmp/engine.cjs   # pull the engine out of the page
node tools/run-cases.cjs /tmp/engine.cjs                   # run ten fixed scenarios
```

`tools/run-cases.cjs` prints totals, the per-minute price, generation counts, working days and every
line item for ten scenarios (defaults, native 4K cinema, IP preset, facial capture, arranged shoot,
CGI render match, trailer preset, gift preset, minimal social clip, explainer). Use it as a
reference whenever you change the engine.

## Docs

* [`docs/original-ru-content.md`](docs/original-ru-content.md) — a full structured breakdown of the
  Russian-language original this page is based on: all copy by section, the complete input model,
  every pricing formula, the switch-to-calculation matrix, side effects of each toggle, and ten
  verified example estimates.
