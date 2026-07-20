#!/usr/bin/env node

import { Command } from "commander";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { launchBrowser, navigateTo, injectCSS } from "./injector.js";
import { readCSSFiles } from "./css-processor.js";
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
  .action(async (cliOptions) => {
    const fileConfig = await loadConfigFile();

    const cliArgs: Partial<Config> = {};
    if (cliOptions.url) cliArgs.url = cliOptions.url;
    if (cliOptions.dir) cliArgs.dir = cliOptions.dir;
    if (cliOptions.include) cliArgs.include = cliOptions.include;
    if (cliOptions.exclude) cliArgs.exclude = cliOptions.exclude;
    if (cliOptions.headless !== undefined) cliArgs.headless = cliOptions.headless;

    const config = mergeConfig(fileConfig, cliArgs);

    if (!config.url) {
      console.error("[css-injector] Error: --url is required (or set in config)");
      process.exit(1);
    }

    console.log(`[css-injector] Opening ${config.url}`);
    console.log(`[css-injector] CSS directory: ${resolve(config.dir)}`);

    const browser = await launchBrowser(config.headless);
    const page = await browser.newPage();

    console.log(`[css-injector] CDP available at http://127.0.0.1:9222`);

    await navigateTo(page, config.url);

    const initialCSS = await readCSSFiles(config.dir, config.include, config.exclude);
    await injectCSS(page, initialCSS);
    console.log(`[css-injector] Injected ${initialCSS.length} bytes of CSS`);

    const stopWatching = startWatching({
      dir: config.dir,
      include: config.include,
      exclude: config.exclude,
      onChange: async (css) => {
        try {
          await injectCSS(page, css);
          console.log(`[css-injector] CSS updated (${css.length} bytes)`);
        } catch (err) {
          console.error("[css-injector] Error updating CSS:", err);
        }
      },
    });

    console.log("[css-injector] Watching for CSS changes. Press Ctrl+C to stop.");

    const cleanup = async () => {
      console.log("\n[css-injector] Shutting down...");
      stopWatching();
      await browser.close();
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  });

program.parse();
