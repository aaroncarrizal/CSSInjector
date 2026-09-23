import type { Target } from "puppeteer";

const NON_PAGE_SCHEMES = ["devtools://", "chrome-devtools://", "chrome://"];

export function isDevtoolsUrl(url: string): boolean {
  return NON_PAGE_SCHEMES.some((scheme) => url.startsWith(scheme));
}

/**
 * Passed as `targetFilter` to puppeteer.launch()/connect(). Without it Puppeteer
 * auto-attaches to every target, including the DevTools frontend (devtools://)
 * and the chrome:// browser_ui targets. Attaching to the DevTools frontend makes
 * the open DevTools window start rendering its own UI (a DevTools-inception
 * effect). Rejecting those URLs keeps Puppeteer (and this CLI) attached only to
 * real pages.
 */
export function skipDevtoolsTargets(target: Target): boolean {
  return !isDevtoolsUrl(target.url());
}
