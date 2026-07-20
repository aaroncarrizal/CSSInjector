import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "node22",
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: [
        "puppeteer",
        "chokidar",
        "fast-glob",
        "commander",
        "node:fs/promises",
        "node:path",
      ],
    },
    outDir: "dist",
    sourcemap: true,
  },
});
