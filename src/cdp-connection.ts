import puppeteer, { type Browser, type Page, type Target } from "puppeteer";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isDevtoolsUrl, skipDevtoolsTargets } from "./target-filter";

export const CDP_URL = "http://127.0.0.1:9222";
export const CONFIG_FILE = resolve(".cssinjector.json");

export interface CdpConfig {
  username: string;
  password: string;
  url: string;
}

export async function loadConfig(): Promise<CdpConfig> {
  try {
    const raw = await readFile(CONFIG_FILE, "utf-8");
    const config = JSON.parse(raw);
    return {
      username: config.username ?? "",
      password: config.password ?? "",
      url: config.url ?? "",
    };
  } catch {
    return { username: "", password: "", url: "" };
  }
}

export async function connect(): Promise<Browser> {
  try {
    return await puppeteer.connect({
      browserURL: CDP_URL,
      defaultViewport: null,
      targetFilter: skipDevtoolsTargets,
    });
  } catch {
    console.error(
      `[cdp-client] Cannot connect to ${CDP_URL}. Is css-injector running?`,
    );
    process.exit(1);
  }
}

export async function getPage(browser: Browser): Promise<Page> {
  const { url, username, password } = await loadConfig();

  let host = "";
  try {
    host = url ? new URL(url).host : "";
  } catch {
    host = "";
  }

  // Use browser.targets() rather than browser.pages(): pages() materialises a
  // Page object for every target (including the DevTools frontend and the
  // chrome:// browser_ui entries), and activating those renders the DevTools
  // UI on top of the open DevTools window.
  const candidates = browser
    .targets()
    .filter((t) => t.type() === "page" && !isDevtoolsUrl(t.url()));

  const target: Target | undefined =
    (host ? candidates.find((t) => t.url().includes(host)) : undefined) ??
    candidates.find((t) => /^https?:/.test(t.url())) ??
    candidates[0];

  const page = await target?.page();

  if (!page) {
    console.error(
      `[cdp-client] No site page found${host ? ` for ${host}` : ""}. Is Chrome open on the target URL?`,
    );
    process.exit(1);
  }

  if (username) {
    await page.authenticate({ username, password });
  }
  return page;
}
