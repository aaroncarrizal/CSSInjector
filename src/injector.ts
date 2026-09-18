import type { Browser, Page, CDPSession } from "puppeteer";

export async function launchBrowser(headless: boolean): Promise<Browser> {
  const puppeteer = await import("puppeteer");
  return puppeteer.default.launch({
    headless,
    channel: "chrome",
    debuggingPort: 9222,
    args: headless ? [] : ["--start-maximized"],
    defaultViewport: headless ? { width: 1280, height: 720 } : null,
  });
}

export interface BasicAuth {
  username: string;
  password: string;
}

export async function navigateTo(page: Page, url: string, auth?: BasicAuth): Promise<void> {
  if (auth && auth.username) {
    await page.authenticate({ username: auth.username, password: auth.password });
  }
  await page.goto(url, { waitUntil: "networkidle2" });
}

export async function injectCSS(page: Page, css: string): Promise<void> {
  await page.evaluate((cssContent: string) => {
    const STYLE_ID = "css-injector";

    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;

    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }

    style.textContent = cssContent;
  }, css);
}

export async function injectScripts(page: Page, js: string): Promise<void> {
  await page.evaluate((jsContent: string) => {
    const SCRIPT_ID = "js-injector";

    document.getElementById(SCRIPT_ID)?.remove();

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.textContent = jsContent;
    (document.head || document.documentElement).appendChild(script);
  }, js);
}

export async function registerOnNewDocument(session: CDPSession, source: string): Promise<string> {
  await session.send("Page.enable");
  const { identifier } = await session.send("Page.addScriptToEvaluateOnNewDocument", { source });
  return identifier;
}

export async function removeOnNewDocument(session: CDPSession, identifier: string): Promise<void> {
  await session.send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
}

export async function stripRemoteStyles(page: Page, patterns: string[]): Promise<void> {
  if (patterns.length === 0) return;

  const count = await page.evaluate((pats: string[]) => {
    const links = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
    ).filter((link) =>
      link.href.endsWith(".default.css") &&
      pats.some((pat) => link.href.includes(pat)),
    );

    links.forEach((link) => link.remove());
    return links.length;
  }, patterns);

  if (count > 0) {
    console.log(`[css-injector] Stripped ${count} remote .default.css stylesheet(s) matching configured patterns`);
  }
}
