#!/usr/bin/env node

import puppeteer, { type Browser, type Page } from "puppeteer";
import { mkdir } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";

const CDP_URL = "http://127.0.0.1:9222";
const DEBUG_DIR = resolve("./debug");
const CONFIG_FILE = resolve(".cssinjector.json");

async function ensureDir(filePath: string) {
  await mkdir(dirname(filePath), { recursive: true });
}

async function loadAuth(): Promise<{ username: string; password: string }> {
  try {
    const raw = await readFile(CONFIG_FILE, "utf-8");
    const config = JSON.parse(raw);
    return {
      username: config.username ?? "",
      password: config.password ?? "",
    };
  } catch {
    return { username: "", password: "" };
  }
}

async function connect() {
  try {
    return await puppeteer.connect({ browserURL: CDP_URL });
  } catch {
    console.error(
      `[cdp-client] Cannot connect to ${CDP_URL}. Is css-injector running?`,
    );
    process.exit(1);
  }
}

async function getPage(browser: Browser) {
  const pages = await browser.pages();
  const page = pages[0];
  const auth = await loadAuth();
  if (auth.username) {
    await page.authenticate(auth);
  }
  return page;
}

async function cmdScreenshot(
  page: Page,
  outputPath?: string,
  fullPage?: boolean,
) {
  const path = outputPath || resolve(DEBUG_DIR, `screenshot-${Date.now()}.png`);
  await ensureDir(path);
  await page.screenshot({ path, fullPage: !!fullPage });
  console.log(path);
}

async function cmdStyles(page: Page, selector: string) {
  const result = await page.evaluate((sel: string) => {
    const el = document.querySelector(sel);
    if (!el) return { error: `No element found for selector: ${sel}` };

    const computed = window.getComputedStyle(el);
    const styles: Record<string, string> = {};
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      styles[prop] = computed.getPropertyValue(prop);
    }

    const rect = el.getBoundingClientRect();
    return {
      selector: sel,
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      classList: Array.from(el.classList),
      boundingBox: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      styles,
    };
  }, selector);

  console.log(JSON.stringify(result, null, 2));
}

async function cmdHtml(page: Page, selector?: string) {
  if (selector) {
    const result = await page.evaluate((sel: string) => {
      const el = document.querySelector(sel);
      if (!el) return `No element found for selector: ${sel}`;
      return el.outerHTML;
    }, selector);
    console.log(result);
  } else {
    const html = await page.content();
    console.log(html);
  }
}

async function cmdSelect(page: Page, selector: string) {
  const result = await page.evaluate((sel: string) => {
    const elements = document.querySelectorAll(sel);
    if (elements.length === 0)
      return { error: `No elements found for selector: ${sel}` };

    const info = Array.from(elements).map((el, i) => {
      const rect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);
      return {
        index: i,
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        classList: Array.from(el.classList),
        visible: computed.display !== "none" && computed.visibility !== "hidden",
        opacity: computed.opacity,
        boundingBox: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
      };
    });

    return { selector: sel, count: elements.length, elements: info };
  }, selector);

  console.log(JSON.stringify(result, null, 2));
}

async function cmdHighlight(page: Page, selector: string) {
  await page.evaluate((sel: string) => {
    const el = document.querySelector(sel);
    if (!el) return;
    (el as HTMLElement).style.outline = "3px solid red";
  }, selector);

  const path = resolve(DEBUG_DIR, `highlight-${Date.now()}.png`);
  await ensureDir(path);
  await page.screenshot({ path });
  console.log(path);
}

async function cmdEval(page: Page, expression: string) {
  const result = await page.evaluate((expr: string) => {
    try {
      return { result: eval(expr) };
    } catch (e: any) {
      return { error: e.message };
    }
  }, expression);

  console.log(JSON.stringify(result, null, 2));
}

async function cmdListElements(page: Page) {
  const result = await page.evaluate(() => {
    const all = document.querySelectorAll("*");
    const tags: Record<string, number> = {};
    for (const el of all) {
      const tag = el.tagName.toLowerCase();
      tags[tag] = (tags[tag] || 0) + 1;
    }
    return {
      total: all.length,
      tags,
    };
  });

  console.log(JSON.stringify(result, null, 2));
}

async function cmdToggleStyles(page: Page, pattern: string) {
  const result = await page.evaluate((pat: string) => {
    const STORE_ID = "css-injector-styles-store";
    const store = document.getElementById(STORE_ID);

    if (store) {
      const links = Array.from(store.querySelectorAll("link"));
      links.forEach((link) => {
        document.head.appendChild(link.cloneNode(true));
      });
      store.remove();
      return { toggled: "restored", count: links.length };
    }

    const links = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
    ).filter((link) => link.href.includes(pat));

    if (links.length === 0) {
      return { toggled: "none", count: 0 };
    }

    const container = document.createElement("div");
    container.id = STORE_ID;
    container.style.display = "none";
    links.forEach((link) => {
      container.appendChild(link.cloneNode(true));
      link.remove();
    });
    document.body.appendChild(container);
    return { toggled: "stripped", count: links.length };
  }, pattern);

  if (result.toggled === "stripped") {
    console.log(`[cdp-client] Stripped ${result.count} stylesheet(s) matching "${pattern}"`);
  } else if (result.toggled === "restored") {
    console.log(`[cdp-client] Restored ${result.count} stylesheet(s)`);
  } else {
    console.log(`[cdp-client] No stylesheets found matching "${pattern}"`);
  }
}

function printUsage() {
  console.log(`Usage: npx tsx src/cdp-client.ts <command> [args]

Commands:
  screenshot [path]              Viewport screenshot (saves PNG)
  fullpage [path]                Full-page screenshot (saves PNG)
  styles <selector>              Computed styles for element
  html [selector]                outerHTML (full page if no selector)
  select <selector>              Element info (tag, classes, bounds)
  highlight <selector>           Add red outline + screenshot
  eval <expression>              Evaluate JS in page context
  list                           List all element tags and counts
  togglestyles <pattern>         Toggle remote stylesheets by href pattern
  help                           Show this help`);
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
      case "screenshot":
        await cmdScreenshot(page, args[1]);
        break;
      case "fullpage":
        await cmdScreenshot(page, args[1], true);
        break;
      case "styles":
        if (!args[1]) {
          console.error("Usage: cdp-client.ts styles <selector>");
          process.exit(1);
        }
        await cmdStyles(page, args[1]);
        break;
      case "html":
        await cmdHtml(page, args[1]);
        break;
      case "select":
        if (!args[1]) {
          console.error("Usage: cdp-client.ts select <selector>");
          process.exit(1);
        }
        await cmdSelect(page, args[1]);
        break;
      case "highlight":
        if (!args[1]) {
          console.error("Usage: cdp-client.ts highlight <selector>");
          process.exit(1);
        }
        await cmdHighlight(page, args[1]);
        break;
      case "eval":
        if (!args[1]) {
          console.error("Usage: cdp-client.ts eval <expression>");
          process.exit(1);
        }
        await cmdEval(page, args[1]);
        break;
      case "list":
        await cmdListElements(page);
        break;
      case "togglestyles":
        if (!args[1]) {
          console.error("Usage: cdp-client.ts togglestyles <pattern>");
          process.exit(1);
        }
        await cmdToggleStyles(page, args[1]);
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
