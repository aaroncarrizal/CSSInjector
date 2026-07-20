# CSS Injector

A CLI tool that injects local CSS files into any published website with instant hot reload support. Uses Puppeteer to launch Chrome, navigate to a target URL, and inject your CSS — updating live whenever you save a file.

## Quick Start

```bash
npm install
npx puppeteer browsers install chrome
npm run dev
```

## Usage

### Basic

```bash
npm run dev
```

Reads `.cssinjector.json` from the project root for configuration.

### With CLI Flags

```bash
npm run dev -- --url https://example.com --dir ./styles
```

### CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `-u, --url <url>` | Target URL to open | (from config) |
| `-d, --dir <path>` | Directory containing CSS files | `./styles` |
| `-i, --include <glob>` | Glob pattern to include | `**/*.css` |
| `-e, --exclude <glob>` | Glob pattern to exclude | (none) |
| `--headless` | Run in headless mode | `false` |

### Config File

Create `.cssinjector.json` in your project root:

```json
{
  "url": "https://www.theoutpostrv.com/",
  "dir": "./styles",
  "include": "**/*.css",
  "exclude": "",
  "headless": false
}
```

CLI flags override config file values.

## How It Works

1. Launches Chrome via Puppeteer with remote debugging enabled
2. Navigates to the target URL
3. Reads all matching `.css` files from the configured directory
4. Injects a `<style id="css-injector">` element into the page
5. Watches the CSS directory for changes
6. On any file change: re-reads all CSS and instantly swaps the style content

No page reload required — CSS updates are applied via DOM manipulation.

## CDP Debugging

The tool exposes Chrome DevTools Protocol on `http://127.0.0.1:9222` while running. You can inspect the live page using the built-in CDP client.

### Commands

In a separate terminal while `npm run dev` is running:

```bash
# Take a viewport screenshot
npm run cdp -- screenshot

# Take a full-page screenshot
npm run cdp -- fullpage

# Save screenshot to specific path
npm run cdp -- screenshot ./debug/my-screenshot.png

# Get computed styles for an element
npm run cdp -- styles ".header-info"

# Get element info (tag, classes, visibility, bounds)
npm run cdp -- select ".header-info"

# Get outerHTML of an element
npm run cdp -- html ".header-info"

# Get full page HTML
npm run cdp -- html

# Highlight an element with a red outline and screenshot
npm run cdp -- highlight ".header-info"

# Evaluate arbitrary JavaScript in the page
npm run cdp -- eval "document.title"

# List all element tags and their counts
npm run cdp -- list
```

Screenshots are saved to the `./debug/` directory.

## Project Structure

```
CSSInjector/
├── src/
│   ├── index.ts          # CLI entry point
│   ├── types.ts          # Config types and defaults
│   ├── css-processor.ts  # Read and combine CSS files
│   ├── injector.ts       # Puppeteer browser and CSS injection
│   ├── watcher.ts        # File system watcher with debounce
│   └── cdp-client.ts     # CDP debugging client
├── styles/               # Your CSS files go here
├── .cssinjector.json     # Configuration
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Development

```bash
# Type check
npm run typecheck

# Build
npm run build

# Run built version
npm start
```

## Dependencies

- [Puppeteer](https://pptr.dev/) — Browser automation
- [Chokidar](https://github.com/paulmillr/chokidar) — File watching
- [Fast Glob](https://github.com/mrmlnc/fast-glob) — File matching
- [Commander](https://github.com/tj/commander.js) — CLI parsing
