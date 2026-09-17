# AGENTS.md

This file provides context for AI agents working on the CSS Injector project.

## Project Overview

CSS Injector is a CLI tool that uses Puppeteer to open a target URL in Chrome, inject local CSS files into the page, and hot-reload whenever the CSS files change on disk. It also exposes a Chrome DevTools Protocol (CDP) client for inspecting the live page.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Run the injector (opens Chrome, navigates to URL, injects CSS, watches for changes) |
| `npm run cdp -- <command>` | Run CDP client commands against the running browser |
| `npm run build` | Build with Vite |
| `npm run typecheck` | TypeScript type checking |
| `npm start` | Run the built version |

## Architecture

```
src/
├── index.ts          # CLI entry point (commander). Loads config, launches browser, registers scripts for new documents, injects CSS, starts watchers, logs CDP endpoint.
├── injector.ts       # Puppeteer browser launch (with debuggingPort: 9222), navigation, <style> injection via page.evaluate(), <script id="js-injector"> injection for hot reload, and Page.addScriptToEvaluateOnNewDocument registration.
├── css-processor.ts  # Reads CSS files from disk using fast-glob + readFile. Returns concatenated string.
├── js-processor.ts   # Reads JS files (scripts/) from disk, same approach as css-processor.
├── watcher.ts        # Chokidar file watcher. Watches a directory, debounces 100ms, calls onChange callback. Accepts a custom `reader` (CSS or JS).
├── cdp-client.ts     # Standalone script that connects to running Chrome via CDP (http://127.0.0.1:9222). Supports screenshot, styles, html, select, highlight, eval, list commands.
└── types.ts          # Config interface and defaults.
```

## Script Injection

Alongside CSS, the injector reads every `**/*.js` file in `./scripts/` (config: `jsDir` / `jsInclude`, defaults `"./scripts"` / `"**/*.js"`) and concatenates them into one bundle. That bundle is registered with CDP `Page.addScriptToEvaluateOnNewDocument`, so it runs on **every new document at the very start — before the page's own scripts**. On a scripts-file change the registration is swapped and the bundle is also re-injected as a `<script id="js-injector">` element into the open page so hot reload applies without navigating.

Use this for DOM fixes that CSS alone cannot reach (cleaning a widget attribute, rewiring a broken API interaction, etc.). Keep scripts scoped/guarded (IIFE) since they run inside the target page, and make them idempotent — they execute at document-start AND may re-run on hot reload. Safe early-run pattern: return immediately if the DOM isn't ready and register a `DOMContentLoaded`/`load` handler (see `scripts/strip-ai-lot-param.js`, `scripts/default-filters-tab.js`). Example: `scripts/strip-ai-lot-param.js` removes a leftover `lots=NNNN` from the AI search widget's `data-base-params`, which otherwise gets appended to the `/search-assistant` URL by `ai-search-cta.js buildTargetUrl()`.

Gotcha — timing-critical fixes need document-start: the site's DOMContentLoaded handlers run (and can crash) before the old `load`-event injection point, so a fix that must run *before* them (e.g. guarding a crash) only works via the `addScriptToEvaluateOnNewDocument` path. Note `window.jQuery` is not defined at document-start even though the page uses it — either guard code to run when jQuery appears (`DOMContentLoaded`/`load`/polling) or avoid jQuery in early fixes.

Gotcha — hero Search button dead: the hero macro renders duplicate `id="topSearchForm"` elements (an outer shell div holding the tabs + AI widget + a hidden orphan Search button, and an inner div with the actual filter selects + the visible Search button). The site's own script binds `$('#topSearchForm').find('.SearchButton')` to the FIRST `#topSearchForm` (the shell), so only the orphan gets a handler and the visible button does nothing. Fix: `scripts/search-button-fix.js` rebinds **every** `.collapse.home-hero-search #topSearchForm .SearchButton` with equivalent `/rv-search?s=true&...` navigation (bind all — `querySelector` alone catches the hidden duplicate macro's button, which is `display:none` but still fires on a programmatic click).

Gotcha — listing carousels render stacked: on `/rv-search` the site's ready batch calls `.attr("name").toLowerCase()` over `:input` collections with no missing-name guard; a nameless control makes it throw and **jQuery 1.8.3 aborts the rest of that ready batch**, so the static-unit Cycle2 init never runs and every `.unit-media-wrapper` shows its slides stacked vertically (wrapper ~1035px tall instead of ~250px). Two independent playwrights: `scripts/name-unnamed-inputs.js` names unnamed controls to keep the crash from firing (observer + a timing-free `getAttribute("name")` guard + a `$.fn.attr` hook), and `scripts/fix-unit-carousels.js` simply re-runs Cycle2 init (`$(el).cycle()`) on any uninitialized `.cycle-slideshow` after load — the deterministic fix, since the crash itself is the site's bug (reproduces on a clean browser with no injector).

## Config

Config is loaded from `.cssinjector.json` in the project root. CLI flags override config file values.

```json
{
  "url": "https://example.com",
  "dir": "./styles",
  "include": "**/*.css",
  "exclude": "",
  "headless": false,
  "stripPatterns": [],
  "username": "",
  "password": ""
}
```

- `username` / `password` – HTTP Basic Auth credentials. Leave empty (`""`) to disable auth. Both the injector and CDP client read these values.
```

## CDP Client Commands

The CDP client connects to `http://127.0.0.1:9222` and provides these commands:

| Command | Output |
|---------|--------|
| `screenshot [path]` | Saves PNG to `./debug/`. If no path given, auto-names with timestamp. |
| `fullpage [path]` | Full-page screenshot |
| `styles <selector>` | JSON with computed styles, tag, id, classList, boundingBox |
| `html [selector]` | outerHTML string (full page if no selector) |
| `select <selector>` | JSON with element count, per-element info (tag, classes, visible, opacity, bounds) |
| `highlight <selector>` | Adds red outline to element, takes screenshot, saves to `./debug/` |
| `eval <expression>` | Evaluates JS in page context, returns JSON result |
| `list` | JSON with total element count and tag frequency map |
| `togglestyles <pattern>` | Toggle remote stylesheets by href pattern (strips/restores `<link>` elements) |

## Key Dependencies

- `puppeteer` - Browser automation and CDP access
- `chokidar` - File system watching
- `fast-glob` - Glob pattern matching for CSS files
- `commander` - CLI argument parsing
- `tsx` - TypeScript execution (dev)
- `vite` - Build tool

## How CSS Injection Works

1. Reads all `.css` files matching the include/exclude patterns from the configured directory
2. Concatenates them into a single string
3. Injects a `<style id="css-injector">` element into the page's `<head>`
4. On file change: re-reads all CSS files, re-concatenates, and updates the style element's textContent

## How Hot Reload Works

- Chokidar watches the CSS directory for `change`, `add`, and `unlink` events
- Changes are debounced (100ms) to avoid rapid re-injection
- On change: the `onChange` callback re-reads all CSS and calls `injectCSS()` to swap the `<style>` tag content
- No page reload — CSS is swapped instantly via DOM manipulation

## CDP Debugging Workflow

1. Run `npm run dev` in one terminal (Chrome opens with CDP on port 9222)
2. Run `npm run cdp -- screenshot` in another terminal to take a screenshot
3. Use `npm run cdp -- styles ".selector"` to inspect computed styles
4. Use `npm run cdp -- highlight ".selector"` to visually identify elements
5. Screenshots are saved to `./debug/` and can be viewed directly

## Auto-Debug Workflow

When the user says "help me debug X" (where X is a CSS selector), automatically:

1. Run all three CDP commands in parallel:
   ```
   npm run cdp -- styles "<selector>"
   npm run cdp -- select "<selector>"
   npm run cdp -- highlight "<selector>"
   ```

2. Analyze the results and **explain the findings** (computed styles, bounding box, visibility, element count)

3. **Ask for permission** before applying any CSS fix

This workflow always runs all three commands regardless of the issue, to ensure full context.

## New Dealer Setup (`/set-up`)

When the user starts with `/set-up` followed by dealer info in this format:
```
Dealer Name: <name>
Site Link: <url>
FR Link: <number>
```

Execute:

1. **Parse fields** – Extract Dealer Name, Site Link, FR Link.
2. **Create git branch** – Convert Dealer Name to kebab-case (lowercase, spaces→hyphens). Check out from master: `git checkout master && git pull && git checkout -b <kebab-name>`.
3. **Configure `.cssinjector.json`** – Set `url` to the Site Link. Set `username: "interactrv"` and `password: "access"` for HTTP Basic Auth (leave empty if the site doesn't need auth). Keep `dir`, `include`, `exclude`, `headless` unchanged.
4. **Ensure `./styles` directory exists** (create if missing).
5. **Report** – Tell the user the branch name and configured URL.

## List of Fixes Workflow

When the user provides a numbered list of CSS fixes/features to apply to the target site:

1. **Read the existing styles** – Read all CSS files in `./styles/` to understand current state.
2. **Process each item sequentially** – Start from item 1 and work through the list in order. Each fix gets implemented, added to a CSS file in `./styles/`, verified via the CDP client if needed.
3. **Commit each task separately** – After completing each item, commit with a message describing the fix (e.g., "fix: add hover to dealer logo on header"). Use `git add -A` and `git commit -m "..."`.
4. **Unresolvable issues** – If an issue cannot be resolved (missing element, unclear requirement, technical limitation), note it in the final report and move to the next item.
5. **Report** – After processing all items, report back with a summary of what was completed and any TODOs left behind.

## Reusable CSS Snippets

Reusable, proven CSS patterns live in `snippets/css/` (NOT `styles/`). Copy the relevant pattern into a `styles/` file when a fix requires it, keeping the scoping selector (e.g. `.homepage`) intact.

| File | Pattern |
|------|---------|
| `nav-transparent.css` | Transparent navbar floating over a hero: white links + text-shadow, dark dropdowns, mobile fallback |
| `hero-overlay.css` | Hero pinned below the header as an absolute overlay: `top: var(--header-height) !important`, `min-height: 0`, 50vh (60vh on short viewports), hidden below 992px |
| `flush-next-section.css` | Next section renders flush under the hero: `margin-top: calc(50vh - var(--nav-height))` (60vh on short viewports) |
| `search-form-one-line.css` | Lays a multi-field search form (`#topSearchForm` / `.SearchPanel`) onto one horizontal line: `display: flex !important` + `flex-wrap: nowrap`, equal-width rows |
| `dropdown-single-tap.css` | Makes Bootstrap navbar sub-dropdowns expand on a single tap below 768px: sticky-touch `:hover` shows the menu (works around the site's jQuery `hover` handler fighting Bootstrap's click toggle, which caused double-tap) |

Key gotchas captured in these snippets:
- The site's bundled CSS may ship `top: 7vh !important` on the hero at 992–1200px — override with `!important`.
- `--header-height` (site-defined) vs `--nav-height` (ours, 62px/66px) are different values; the flush margin formula subtracts `--nav-height`, never `--header-height`.
- Short-viewport (`max-height: 800px`) overrides must be placed after the base rules so the cascade wins.
- Search-form rows: bundled CSS makes the form `display: inline-block` at desktop and the `SearchRow`s `display: inline-block`, which lets the last rows + button wrap to a second line. Force `display: flex !important` on the form with `flex-wrap: nowrap` and make each row `flex: 1 1 0 !important` so they share the line. The `display` values on the form/rows are overridden by bundled rules, so `!important` is required.
- Dropdown double-tap on mobile: a bundled inline jQuery `hover` handler on `li.dropdown` adds `.open` on tap (via `mouseenter`) and Bootstrap's click toggle then removes it — one tap nets out closed. Fix via sticky touch `:hover` display (see `dropdown-single-tap.css`); never re-add `.open` styling to mobile, and force `position: static` below 768px so the menu stays in-flow.
- Debugging responsively: the CDP client connects to `pages[0]`; if a DevTools tab is open it's the first page, so the debugger targets DevTools instead of the site. When testing responsive layouts, verify at a real desktop width (e.g. CDP `Emulation.setDeviceMetricsOverride`), not the DevTools-docked viewport.

## Reusable JS Snippets

Reusable, proven DOM/JS fixes live in `snippets/js/` (NOT `scripts/`). Copy the relevant file into `scripts/` when a fix requires it — the injector will then register it for every new document. All snippets are guarded IIFEs and safe to run repeatedly (document-start + hot reload).

| File | Pattern |
|------|---------|
| `name-unnamed-inputs.js` | Keeps a site crash from firing: names every unnamed form control via a MutationObserver, a timing-free `Element.prototype.getAttribute("name")` guard, and a `$.fn.attr("name")` hook. Use when the site does unguarded `.attr("name").toLowerCase()`. |
| `fix-unit-carousels.js` | Re-runs Cycle2 init (`$(el).cycle()`) on any `.cycle-slideshow` that never initialized (no `.cycle-slide-active`). Deterministic fix when the site's own ready batch aborts before its carousel init. |
| `search-button-fix.js` | Rebinds every `.collapse.home-hero-search #topSearchForm .SearchButton` to navigate `/rv-search?s=true&...` (works around the site binding only the first duplicate-id form's orphan button). |
| `default-filters-tab.js` | Forces the AI-search widget's Filters tab as the default mode and clears a persisted tab choice. |
| `strip-ai-lot-param.js` | Removes a stray `lots=NNNN` from the AI search widget's `data-base-params` before submit. |

Snippet gotchas:
- Early (document-start) scripts must not assume jQuery or DOM exists — `window.jQuery` is undefined on new documents; install jQuery hooks when it appears (poll / `DOMContentLoaded` / `load`).
- A `MutationObserver` callback runs on a later microtask, so it cannot patch DOM the page inserts and reads *synchronously in the same task* (e.g. swap form HTML then submit). Prefer a getter/prototype guard for those.
- jQuery 1.8.3 aborts the remaining callbacks in a ready batch when one throws — one bad handler silently kills unrelated init (carousels, tabs).

## Notes

- The tool uses `channel: "chrome"` to use the system Chrome installation (not Puppeteer's bundled Chromium)
- CDP is always available on port 9222 when the injector is running
- The `debug/` directory is created automatically when saving screenshots
- `Ctrl+C` gracefully shuts down the browser and watcher
