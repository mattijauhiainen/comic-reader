#!/usr/bin/env bun

import { spawn } from "bun";
import { existsSync } from "fs";

// Parse arguments
const args = process.argv.slice(2);
let album: string | undefined;
let albumName: string | undefined;
let startPage = 1;
let endPage = 999;
let cliMode = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--album" && i + 1 < args.length) {
    album = args[i + 1];
    i++;
  } else if (args[i] === "--album-name" && i + 1 < args.length) {
    albumName = args[i + 1];
    i++;
  } else if (args[i] === "--start" && i + 1 < args.length) {
    startPage = Number.parseInt(args[i + 1]);
    i++;
  } else if (args[i] === "--end" && i + 1 < args.length) {
    endPage = Number.parseInt(args[i + 1]);
    i++;
  } else if (args[i] === "--cli") {
    cliMode = true;
  }
}

if (!album) {
  console.error("Error: --album parameter is required");
  console.error(
    "Usage: bun run translate --album <album-name> --album-name <title> [--start N] [--end N] [--cli]",
  );
  console.error(
    'Example: bun run translate --album pizarro --album-name "Tintin and the Picaros"',
  );
  process.exit(1);
}

if (!albumName) {
  console.error("Error: --album-name parameter is required");
  console.error(
    "Usage: bun run translate --album <album-name> --album-name <title> [--start N] [--end N] [--cli]",
  );
  console.error(
    'Example: bun run translate --album pizarro --album-name "Tintin and the Picaros"',
  );
  process.exit(1);
}

console.log(`Translating album: ${albumName} (${album})`);
console.log(`Page range: ${startPage} to ${endPage}`);
console.log(`CLI mode: ${cliMode ? "enabled" : "disabled"}`);

let processedCount = 0;

for (let i = startPage; i <= endPage; i++) {
  const inputFile = `assets/${album}/page${i}-ocr.json`;

  if (!existsSync(inputFile)) {
    continue;
  }

  const outputFile = `assets/${album}/page${i}-translation.json`;
  console.log(`\nTranslating page ${i}...`);

  const translateArgs = [
    "bun",
    "run",
    "translator/src/index.ts",
    "--input",
    inputFile,
    "--output",
    outputFile,
    "--album",
    albumName,
  ];

  if (cliMode) {
    translateArgs.push("--cli");
  }

  const proc = spawn(translateArgs, {
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    console.error(`Failed to translate page ${i} with exit code: ${exitCode}`);
    process.exit(exitCode);
  }

  processedCount++;
}

if (processedCount === 0) {
  console.error(
    `No OCR files found in assets/${album} for pages ${startPage}-${endPage}`,
  );
  process.exit(1);
}

console.log(`\nTranslation complete! Processed ${processedCount} pages.`);
