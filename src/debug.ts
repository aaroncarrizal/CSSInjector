#!/usr/bin/env node

import type { Page } from "puppeteer";
import { mkdir, readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { connect, getPage } from "./cdp-connection.ts";

const DEBUG_DIR = resolve("./debug");
const PREVIEW_ID = "debug-preview";
const OUTLINE_ID = "debug-outline-style";

const BOOTSTRAP_BREAKPOINTS: Record<string, number> = {
  xs: 375,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
};

async function ensureDir(filePath: string) {
  await mkdir(dirname(filePath), { recursive: true });
}

/**
 * Locate elements by their visible text. Returns the deepest matches (the ones
 * that actually hold the text, not their ancestors) with a suggested selector,
 * so a described section ("the reviews section") can be turned into a selector
 * without reading the whole DOM.
 */
async function cmdFind(page: Page, text: string, limit = 15) {
  const result = await page.evaluate(
    (needle: string, lim: number) => {
      const lower = needle.toLowerCase();
      const out: unknown[] = [];
      for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
        const own = (el.textContent || "").toLowerCase();
        if (!own.includes(lower)) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;

        let childHasText = false;
        for (const child of Array.from(el.children)) {
          if ((child.textContent || "").toLowerCase().includes(lower)) {
            childHasText = true;
            break;
          }
        }
        if (childHasText) continue;

        // Build a reasonably unique selector for this element.
        let selector: string;
        if (el.id && !/^\d/.test(el.id)) {
          selector = "#" + CSS.escape(el.id);
        } else {
          let path = "";
          let node: Element | null = el;
          for (
            let depth = 0;
            node && node !== document.body && depth < 5;
            depth++
          ) {
            let part = node.tagName.toLowerCase();
            if (node.id && !/^\d/.test(node.id)) {
              path = "#" + CSS.escape(node.id) + (path ? " > " + path : "");
              break;
            }
            const classes = Array.from(node.classList).slice(0, 2);
            part += classes.map((c) => "." + CSS.escape(c)).join("");
            const parent = node.parentElement;
            const current = node;
            if (parent) {
              const same = Array.from(parent.children).filter(
                (c) => c.tagName === current.tagName,
              );
              if (same.length > 1) {
                part += `:nth-of-type(${same.indexOf(current) + 1})`;
              }
            }
            path = path ? part + " > " + path : part;
            node = node.parentElement;
          }
          selector = path;
        }

        out.push({
          selector,
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          classes: Array.from(el.classList),
          box: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 90),
        });
      }
      return out;
    },
    text,
    limit,
  );
  console.log(JSON.stringify(result, null, 2));
}

/**
 * Box-model + layout + ancestor chain for a selector. The ancestor chain is what
 * usually answers "why isn't this centered / why is it this wide" — it surfaces
 * each wrapping container's display, max-width and margins.
 */
async function cmdBox(page: Page, selector: string) {
  const result = await page.evaluate((sel: string) => {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) return { error: `No element found for: ${sel}` };

    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();

    const ancestors: unknown[] = [];
    let node = el.parentElement;
    for (let i = 0; i < 6 && node; i++) {
      const pcs = getComputedStyle(node);
      const r = node.getBoundingClientRect();
      ancestors.push({
        tag: node.tagName.toLowerCase(),
        id: node.id || null,
        classes: Array.from(node.classList).slice(0, 4),
        display: pcs.display,
        maxWidth: pcs.maxWidth,
        width: Math.round(r.width),
        margin: pcs.margin,
        padding: pcs.padding,
      });
      node = node.parentElement;
    }

    return {
      selector: sel,
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      classes: Array.from(el.classList),
      box: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      layout: {
        display: cs.display,
        position: cs.position,
        width: cs.width,
        height: cs.height,
        maxWidth: cs.maxWidth,
        margin: cs.margin,
        padding: cs.padding,
        textAlign: cs.textAlign,
        flex: cs.display.includes("flex")
          ? {
              direction: cs.flexDirection,
              justify: cs.justifyContent,
              align: cs.alignItems,
              gap: cs.gap,
            }
          : null,
      },
      ancestors,
    };
  }, selector);
  console.log(JSON.stringify(result, null, 2));
}

/**
 * Outline matching elements (or every element) and screenshot, to visually map
 * the layout. `outline reset` removes the overlay.
 */
async function cmdOutline(page: Page, selector?: string) {
  if (selector === "reset") {
    await page.evaluate((id: string) => document.getElementById(id)?.remove(), OUTLINE_ID);
    console.log("[debug] Outline overlay removed");
    return;
  }

  const count = await page.evaluate(
    (id: string, sel: string | null) => {
      document.getElementById(id)?.remove();
      const style = document.createElement("style");
      style.id = id;
      style.textContent = sel
        ? `${sel}{outline:2px solid red !important;outline-offset:-2px !important;}`
        : `body *{outline:1px solid rgba(255,0,0,.35) !important;}`;
      document.head.appendChild(style);
      return document.querySelectorAll(sel ?? "body *").length;
    },
    OUTLINE_ID,
    selector ?? null,
  );

  const path = resolve(DEBUG_DIR, `outline-${Date.now()}.png`);
  await ensureDir(path);
  await page.screenshot({ path });
  console.log(`[debug] Outlined ${count} element(s) -> ${path}`);
}

/**
 * Report how a selector behaves across Bootstrap breakpoints (or custom
 * widths): display/visibility/opacity, box size and whether it is on screen.
 * Restores the original viewport afterwards.
 */
async function cmdCheck(page: Page, selector: string, widths: number[]) {
  const original = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  const results: unknown[] = [];
  for (const width of widths) {
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    await new Promise((r) => setTimeout(r, 150));
    const info = await page.evaluate((sel: string) => {
      const el = document.querySelector<HTMLElement>(sel);
      if (!el) return { present: false };
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        present: true,
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        width: Math.round(r.width),
        height: Math.round(r.height),
        x: Math.round(r.x),
        visible:
          cs.display !== "none" &&
          cs.visibility !== "hidden" &&
          Number(cs.opacity) > 0 &&
          r.width > 0 &&
          r.height > 0,
        inViewport:
          r.top < window.innerHeight &&
          r.bottom > 0 &&
          r.left < window.innerWidth &&
          r.right > 0,
      };
    }, selector);

    const name = Object.entries(BOOTSTRAP_BREAKPOINTS).find(
      ([, v]) => v === width,
    )?.[0];
    results.push({ width, breakpoint: name ?? null, ...info });
  }

  await page.setViewport({
    width: original.width,
    height: original.height,
    deviceScaleFactor: 1,
  });

  console.log(JSON.stringify({ selector, results }, null, 2));
}

/**
 * Live-preview CSS on the page via a persistent <style id="debug-preview">
 * without touching any file in styles/. Accepts raw CSS or `@path/to/file.css`.
 * `preview reset` clears it.
 */
async function cmdPreview(page: Page, arg: string) {
  if (arg === "reset" || arg === "--reset") {
    const removed = await page.evaluate((id: string) => {
      const el = document.getElementById(id);
      if (!el) return false;
      el.remove();
      return true;
    }, PREVIEW_ID);
    console.log(`[debug] Preview ${removed ? "cleared" : "was not set"}`);
    return;
  }

  let css = arg;
  if (arg.startsWith("@")) {
    css = await readFile(resolve(arg.slice(1)), "utf-8");
  }

  await page.evaluate(
    (id: string, content: string) => {
      let style = document.getElementById(id) as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement("style");
        style.id = id;
        document.head.appendChild(style);
      }
      style.textContent = content;
    },
    PREVIEW_ID,
    css,
  );
  console.log(`[debug] Preview applied (${css.length} bytes) as #${PREVIEW_ID}`);
}

/**
 * Append a single declaration to the preview stylesheet: `set ".foo img" width 320px`.
 */
async function cmdSet(page: Page, selector: string, prop: string, value: string) {
  await page.evaluate(
    (id: string, sel: string, p: string, v: string) => {
      let style = document.getElementById(id) as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement("style");
        style.id = id;
        document.head.appendChild(style);
      }
      style.textContent += `\n${sel}{${p}:${v};}`;
    },
    PREVIEW_ID,
    selector,
    prop,
    value,
  );
  console.log(`[debug] Added: ${selector} { ${prop}: ${value}; }`);
}

/**
 * Screenshot just one element (a section) so a before/after can be compared.
 */
async function cmdCrop(page: Page, selector: string, outputPath?: string) {
  const handle = await page.$(selector);
  if (!handle) {
    console.error(`[debug] No element found for: ${selector}`);
    process.exit(1);
  }
  const path = outputPath || resolve(DEBUG_DIR, `crop-${Date.now()}.png`);
  await ensureDir(path);
  await handle.screenshot({ path });
  console.log(path);
}

function printUsage() {
  console.log(`Usage: npx tsx src/debug.ts <command> [args]

Commands:
  find <text> [limit]              Find elements by text, with suggested selectors
  box <selector>                   Box model, layout + ancestor chain
  outline [selector|reset]         Outline elements + screenshot (all if no selector)
  check <selector> [widths...]     Visibility/box across breakpoints (default: all)
  preview <css|@file>              Live-preview CSS (persists as #${PREVIEW_ID})
  preview reset                    Clear the preview CSS
  set <selector> <prop> <value>    Append one declaration to the preview CSS
  crop <selector> [path]           Screenshot a single element
  help                             Show this help

Examples:
  npm run dbg -- find "Reviews"
  npm run dbg -- box ".reviews .card img"
  npm run dbg -- check "header nav" 1032 1376
  npm run dbg -- preview ".reviews .card img{width:320px} .reviews{justify-content:center}"
  npm run dbg -- crop ".reviews"`);
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
    switch (command) {
      case "find": {
        if (!args[1]) {
          console.error("Usage: npx tsx src/debug.ts find <text> [limit]");
          process.exit(1);
        }
        const rest = args.slice(1);
        let limit = 15;
        const last = rest[rest.length - 1];
        if (rest.length > 1 && /^\d+$/.test(last)) {
          limit = Number(last);
          rest.pop();
        }
        await cmdFind(page, rest.join(" "), limit);
        break;
      }
      case "box":
        if (!args[1]) {
          console.error("Usage: npx tsx src/debug.ts box <selector>");
          process.exit(1);
        }
        await cmdBox(page, args[1]);
        break;
      case "outline":
        await cmdOutline(page, args[1]);
        break;
      case "check": {
        if (!args[1]) {
          console.error("Usage: npx tsx src/debug.ts check <selector> [widths...]");
          process.exit(1);
        }
        const widths = args.slice(2).map(Number).filter((n) => n > 0);
        await cmdCheck(
          page,
          args[1],
          widths.length > 0 ? widths : Object.values(BOOTSTRAP_BREAKPOINTS),
        );
        break;
      }
      case "preview":
        if (!args[1]) {
          console.error("Usage: npx tsx src/debug.ts preview <css|@file|reset>");
          process.exit(1);
        }
        await cmdPreview(page, args.slice(1).join(" "));
        break;
      case "set":
        if (!args[1] || !args[2] || !args[3]) {
          console.error("Usage: npx tsx src/debug.ts set <selector> <prop> <value>");
          process.exit(1);
        }
        await cmdSet(page, args[1], args[2], args.slice(3).join(" "));
        break;
      case "crop":
        if (!args[1]) {
          console.error("Usage: npx tsx src/debug.ts crop <selector> [path]");
          process.exit(1);
        }
        await cmdCrop(page, args[1], args[2]);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } finally {
    browser.disconnect();
  }
}

main();
