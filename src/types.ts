import type { Browser, Page } from "puppeteer";

export interface Config {
  url: string;
  dir: string;
  include: string;
  exclude: string;
  headless: boolean;
  stripPatterns: string[];
}

export interface InjectorState {
  browser: Browser | null;
  page: Page | null;
  currentCSS: string;
  watcherRunning: boolean;
}

export const DEFAULT_CONFIG: Config = {
  url: "",
  dir: "./styles",
  include: "**/*.css",
  exclude: "",
  headless: false,
  stripPatterns: [],
};
