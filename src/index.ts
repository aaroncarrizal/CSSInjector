#!/usr/bin/env node

import { Command } from "commander";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { launchBrowser, navigateTo, injectCSS, injectScripts, stripRemoteStyles, registerOnNewDocument, removeOnNewDocument } from "./injector.js";
import { readCSSFiles } from "./css-processor.js";
import { readJSFiles } from "./js-processor.js";
import { startWatching } from "./watcher.js";
import { DEFAULT_CONFIG } from "./types.js";
import type { Config } from "./types.js";

const CONFIG_FILE = ".cssinjector.json";

async function loadConfigFile(): Promise<Partial<Config>> {
  try {
    const configPath = resolve(CONFIG_FILE);
    const raw = await readFile(configPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function mergeConfig(
  fileConfig: Partial<Config>,
  cliArgs: Partial<Config>,
): Config {
  return {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...Object.fromEntries(
      Object.entries(cliArgs).filter(([, v]) => v !== undefined && v !== ""),
    ),
  };
}

const program = new Command();

program
  .name("css-injector")
  .description("Inject CSS into any website with hot reload")
  .version("1.0.0")
  .option("-u, --url <url>", "Target URL to open")
  .option("-d, --dir <path>", "CSS directory")
  .option("-i, --include <glob>", "Include glob pattern")
  .option("-e, --exclude <glob>", "Exclude glob pattern")
  .option("--headless", "Run in headless mode")
  .option("-s, --strip-patterns <patterns>", "Comma-separated patterns to strip remote stylesheets by href")
  .option("--username <username>", "HTTP Basic Auth username")
  .option("--password <password>", "HTTP Basic Auth password")
  .action(async (cliOptions) => {
    const fileConfig = await loadConfigFile();

    const cliArgs: Partial<Config> = {};
    if (cliOptions.url) cliArgs.url = cliOptions.url;
    if (cliOptions.dir) cliArgs.dir = cliOptions.dir;
    if (cliOptions.include) cliArgs.include = cliOptions.include;
    if (cliOptions.exclude) cliArgs.exclude = cliOptions.exclude;
    if (cliOptions.headless !== undefined) cliArgs.headless = cliOptions.headless;
    if (cliOptions.stripPatterns) cliArgs.stripPatterns = cliOptions.stripPatterns.split(",");
    if (cliOptions.username) cliArgs.username = cliOptions.username;
    if (cliOptions.password) cliArgs.password = cliOptions.password;

    const config = mergeConfig(fileConfig, cliArgs);

    if (!config.url) {
      console.error("[css-injector] Error: --url is required (or set in config)");
      process.exit(1);
    }

    console.log(`[css-injector] Opening ${config.url}`);
    console.log(`[css-injector] CSS directory: ${resolve(config.dir)}`);

    const browser = await launchBrowser(config.headless);
    const [page] = await browser.pages();

    console.log(`[css-injector] CDP available at http://127.0.0.1:9222`);

    const initialCSS = await readCSSFiles(config.dir, config.include, config.exclude);
    const initialJS = await readJSFiles(config.jsDir ?? "./scripts", config.jsInclude ?? "**/*.js");

    let currentCSS = initialCSS;
    let currentJS = initialJS;

    // Register JS so it runs on EVERY new document at the very start (before
    // the page's own scripts). Timing-critical fixes need this: the site's
    // DOMContentLoaded handlers crash on nameless hero inputs and would have
    // already run by the time scripts were injected on the 'load' event.
    const scriptSession = await page.createCDPSession();
    let docScriptIdentifier = "";
    if (initialJS.length > 0) {
      docScriptIdentifier = await registerOnNewDocument(scriptSession, initialJS);
    }

    await navigateTo(page, config.url, { username: config.username ?? "", password: config.password ?? "" });

    await stripRemoteStyles(page, config.stripPatterns);

    await injectCSS(page, initialCSS);
    console.log(`[css-injector] Injected ${initialCSS.length} bytes of CSS`);

    if (initialJS.length > 0) {
      console.log(`[css-injector] Registered ${initialJS.length} bytes of JS for new documents`);
    }

    page.on("load", async () => {
      try {
        await stripRemoteStyles(page, config.stripPatterns);
        await injectCSS(page, currentCSS);
        console.log(`[css-injector] Re-injected CSS (${currentCSS.length} bytes) after navigation`);
      } catch (err) {
        console.error("[css-injector] Error re-injecting CSS:", err);
      }
    });

    const stopWatching = startWatching({
      dir: config.dir,
      include: config.include,
      exclude: config.exclude,
      onChange: async (css) => {
        try {
          currentCSS = css;
          await injectCSS(page, css);
          console.log(`[css-injector] CSS updated (${css.length} bytes)`);
        } catch (err) {
          console.error("[css-injector] Error updating CSS:", err);
        }
      },
    });

    const stopWatchingJS = startWatching({
      dir: config.jsDir ?? "./scripts",
      include: config.jsInclude ?? "**/*.js",
      exclude: "",
      reader: readJSFiles,
      onChange: async (js) => {
        try {
          currentJS = js;
          if (docScriptIdentifier) {
            await removeOnNewDocument(scriptSession, docScriptIdentifier);
            docScriptIdentifier = "";
          }
          if (js.length > 0) {
            docScriptIdentifier = await registerOnNewDocument(scriptSession, js);
          }
          await injectScripts(page, js);
          console.log(`[css-injector] JS updated (${js.length} bytes)`);
        } catch (err) {
          console.error("[css-injector] Error updating JS:", err);
        }
      },
    });

    console.log("[css-injector] Watching for CSS/JS changes. Press Ctrl+C to stop.");

    const cleanup = async () => {
      console.log("\n[css-injector] Shutting down...");
      stopWatching();
      stopWatchingJS();
      await browser.close();
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  });

program.parse();
