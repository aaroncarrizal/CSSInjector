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
