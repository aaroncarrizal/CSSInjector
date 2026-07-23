import type { Browser, Page } from "puppeteer";

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

export async function navigateTo(page: Page, url: string): Promise<void> {
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
