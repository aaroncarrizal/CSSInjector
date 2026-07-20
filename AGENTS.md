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
├── index.ts          # CLI entry point (commander). Loads config, launches browser, injects CSS, starts watcher, logs CDP endpoint.
├── injector.ts       # Puppeteer browser launch (with debuggingPort: 9222), navigation, and <style> injection via page.evaluate().
├── css-processor.ts  # Reads CSS files from disk using fast-glob + readFile. Returns concatenated string.
├── watcher.ts        # Chokidar file watcher. Watches CSS directory, debounces 100ms, calls onChange callback.
├── cdp-client.ts     # Standalone script that connects to running Chrome via CDP (http://127.0.0.1:9222). Supports screenshot, styles, html, select, highlight, eval, list commands.
└── types.ts          # Config interface and defaults.
```

## Config

Config is loaded from `.cssinjector.json` in the project root. CLI flags override config file values.

```json
{
  "url": "https://example.com",
  "dir": "./styles",
  "include": "**/*.css",
  "exclude": "",
  "headless": false
}
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

## Notes

- The tool uses `channel: "chrome"` to use the system Chrome installation (not Puppeteer's bundled Chromium)
- CDP is always available on port 9222 when the injector is running
- The `debug/` directory is created automatically when saving screenshots
- `Ctrl+C` gracefully shuts down the browser and watcher
