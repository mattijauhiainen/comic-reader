#!/usr/bin/env bun

import { glob } from "glob";
import { spawn } from "bun";

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
  console.error("Usage: bun run extract:panels --album <album-name>");
  console.error("Example: bun run extract:panels --album pizarro");
  process.exit(1);
}

console.log(`Extracting panels for album: ${album}`);

const pattern = `assets/${album}/*.avif`;
const files = await glob(pattern);

if (files.length === 0) {
  console.error(`No .avif files found in assets/${album}`);
  process.exit(1);
}

console.log(`Found ${files.length} pages to process`);

for (const file of files) {
  const outputFile = file.replace(/\.avif$/, ".json");
  console.log(`Processing: ${file}`);

  const proc = spawn(
    ["bun", "run", "panelExtractor/src/index.ts", file, "-o", outputFile],
    {
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

console.log("Panel extraction complete!");
