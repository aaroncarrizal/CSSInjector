#!/usr/bin/env node

import type { Page } from "puppeteer";
import { connect, getPage } from "./cdp-connection.ts";

// Bootstrap 5 default breakpoints (min-width). xs has no min, so a typical
// phone width is used to exercise the xs range.
const BOOTSTRAP_BREAKPOINTS: Record<string, number> = {
  xs: 375,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
};

const DEFAULT_VIEWPORT_HEIGHT = 900;

function parseSize(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function applyViewport(
  page: Page,
  width: number,
  height: number,
  mobile: boolean,
) {
  await page.setViewport({
    width,
    height,
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
  });
  console.log(
    `[breakpoint] Viewport -> ${width}x${height}${mobile ? " (mobile)" : ""}`,
  );
}

async function applyBreakpoint(page: Page, name: string, heightArg?: string) {
  const key = name.toLowerCase().replace(/^bp-/, "");
  const width = BOOTSTRAP_BREAKPOINTS[key];
  if (!width) {
    console.error(
      `[breakpoint] Unknown breakpoint "${name}". Options: ${Object.keys(BOOTSTRAP_BREAKPOINTS).join(", ")}`,
    );
    process.exit(1);
  }
  const height = parseSize(heightArg, DEFAULT_VIEWPORT_HEIGHT);
  await applyViewport(page, width, height, width < 768);
}

async function applyResize(page: Page, widthArg: string, heightArg?: string) {
  const width = Number.parseInt(widthArg, 10);
  if (!Number.isFinite(width) || width <= 0) {
    console.error("Usage: npx tsx src/breakpoint.ts resize <width> [height]");
    process.exit(1);
  }
  const height = parseSize(heightArg, DEFAULT_VIEWPORT_HEIGHT);
  await applyViewport(page, width, height, width < 768);
}

function printUsage() {
  console.log(`Usage: npx tsx src/breakpoint.ts <command> [args]

Commands:
  <size> [height]           Bootstrap breakpoint: xs sm md lg xl xxl
  resize <width> [height]   Set an arbitrary viewport size
  help                      Show this help

Breakpoints (Bootstrap 5 min-widths, default height ${DEFAULT_VIEWPORT_HEIGHT}):
${Object.entries(BOOTSTRAP_BREAKPOINTS)
  .map(([k, v]) => `  ${k.padEnd(4)} ${v}px`)
  .join("\n")}`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help") {
    printUsage();
    return;
  }

  const browser = await connect();
  const page = await getPage(browser);

  try {
    if (command === "resize") {
      if (!args[1]) {
        console.error("Usage: npx tsx src/breakpoint.ts resize <width> [height]");
        process.exit(1);
      }
      await applyResize(page, args[1], args[2]);
    } else {
      await applyBreakpoint(page, command, args[1]);
    }
  } finally {
    browser.disconnect();
  }
}

main();
