#!/usr/bin/env bun

import { glob } from "glob";
import { spawn } from "bun";
import { basename } from "path";

// Parse arguments
const args = process.argv.slice(2);
let album: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--album" && i + 1 < args.length) {
    album = args[i + 1];
    i++;
  }
}

if (!album) {
  console.error("Error: --album parameter is required");
  console.error("Usage: bun run extract:ocr --album <album-name>");
  console.error("Example: bun run extract:ocr --album pizarro");
  process.exit(1);
}

console.log(`Running OCR for album: ${album}`);

const pattern = `assets/${album}/*.avif`;
const files = await glob(pattern);

if (files.length === 0) {
  console.error(`No .avif files found in assets/${album}`);
  process.exit(1);
}

console.log(`Found ${files.length} pages to process`);

for (const file of files) {
  const base = basename(file, ".avif");
  const bubblesFile = `assets/${album}/${base}-bubbles.json`;
  const outputFile = `assets/${album}/${base}-ocr.json`;

  console.log(`Processing: ${file}`);

  const proc = spawn(
    [
      "uv",
      "run",
      "python",
      "run_ocr.py",
      "--image",
      `../${file}`,
      "--bubbles",
      `../${bubblesFile}`,
      "--output",
      `../${outputFile}`,
    ],
    {
      cwd: "ocr",
      stdout: "inherit",
      stderr: "inherit",
    },
  );

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    console.error(`Failed to process ${file} with exit code: ${exitCode}`);
    process.exit(exitCode);
  }
}

console.log("OCR complete!");
