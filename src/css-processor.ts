import fg from "fast-glob";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function readCSSFiles(
  dir: string,
  include: string,
  exclude: string,
): Promise<string> {
  const cwd = resolve(dir);

  const files = await fg(include, {
    cwd,
    absolute: true,
    ignore: exclude ? [exclude] : [],
  });

  if (files.length === 0) {
    return "";
  }

  const contents = await Promise.all(
    files.map((file) => readFile(file, "utf-8")),
  );

  return contents.join("\n");
}
