import chokidar from "chokidar";
import { resolve } from "node:path";
import { readCSSFiles } from "./css-processor.js";

export interface WatcherOptions {
  dir: string;
  include: string;
  exclude: string;
  onChange: (content: string) => void;
  reader?: (dir: string, include: string, exclude: string) => Promise<string>;
}

type FileReader = (dir: string, include: string, exclude: string) => Promise<string>;

export function startWatching(options: WatcherOptions): () => void {
  const { dir, include, exclude, onChange } = options;
  const reader: FileReader = options.reader ?? readCSSFiles;
  const watchPath = resolve(dir);
  let debounceTimer: NodeJS.Timeout | null = null;

  const readAndUpdate = async () => {
    try {
      const content = await reader(watchPath, include, exclude);
      onChange(content);
    } catch (err) {
      console.error(`[css-injector] Error reading files in ${watchPath}:`, err);
    }
  };

  const debouncedUpdate = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(readAndUpdate, 100);
  };

  const watcher = chokidar.watch(watchPath, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 50,
      pollInterval: 10,
    },
  });

  watcher.on("change", debouncedUpdate);
  watcher.on("add", debouncedUpdate);
  watcher.on("unlink", debouncedUpdate);

  console.log(`[css-injector] Watching ${watchPath} for changes...`);

  return () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    watcher.close();
  };
}
