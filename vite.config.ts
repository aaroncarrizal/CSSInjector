import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "node24",
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: (id: string) =>
        id.startsWith("node:") || ["puppeteer", "chokidar", "fast-glob", "commander"].includes(id),
    },
    outDir: "dist",
    sourcemap: true,
  },
});
