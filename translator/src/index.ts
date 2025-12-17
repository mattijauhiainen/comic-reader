#!/usr/bin/env bun
import { processOcrFile } from "./translate";
import type { CliArgs } from "./types";
import * as path from "node:path";
import { existsSync } from "node:fs";

/**
 * Parse command-line arguments
 */
function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: CliArgs = {
    input: "",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--input":
      case "-i":
        parsed.input = args[++i];
        break;
      case "--output":
      case "-o":
        parsed.output = args[++i];
        break;
      case "--album":
      case "-a":
        parsed.album = args[++i];
        break;
      case "--model":
      case "-m":
        parsed.model = args[++i];
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        if (!arg.startsWith("-")) {
          // Assume it's the input file if not already set
          if (!parsed.input) {
            parsed.input = arg;
          }
        } else {
          console.error(`Unknown option: ${arg}`);
          printHelp();
          process.exit(1);
        }
    }
  }

  return parsed;
}

/**
 * Print usage help
 */
function printHelp(): void {
  console.log(`
Comic Book Translator - Translate Chinese text bubbles to English

Usage:
  bun run src/index.ts --input <ocr-file> [options]

Options:
  -i, --input <file>     Path to OCR JSON file (required)
  -o, --output <file>    Output path (default: <input>-translation.json)
  -a, --album <name>     Comic album/series name (optional, adds context to prompt)
  -m, --model <model>    Anthropic model to use (default: claude-sonnet-4-5-20250929)
  -h, --help             Show this help message

Environment Variables:
  ANTHROPIC_API_KEY      Anthropic API key (required, load from .env file)

Examples:
  bun run src/index.ts --input ../assets/pizarro/page1-ocr.json
  bun run src/index.ts --input page1-ocr.json --album pizarro
  bun run src/index.ts -i page1-ocr.json -o page1-trans.json -a pizarro
`);
}

/**
 * Main function
 */
async function main() {
  console.log("Comic Book Translator\n");

  // Parse arguments
  const args = parseArgs();

  // Validate required arguments
  if (!args.input) {
    console.error("Error: --input is required\n");
    printHelp();
    process.exit(1);
  }

  // Check input file exists
  if (!existsSync(args.input)) {
    console.error(`Error: Input file not found: ${args.input}`);
    process.exit(1);
  }

  // Load API key from environment
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Error: ANTHROPIC_API_KEY environment variable not set\n");
    console.error("Please create a .env file with:");
    console.error("  ANTHROPIC_API_KEY=sk-ant-api03-your-key-here\n");
    console.error("See .env.example for reference");
    process.exit(1);
  }

  // Determine output path
  const outputPath =
    args.output || args.input.replace(/(-ocr)?\.json$/, "-translation.json");

  console.log(`Input:  ${args.input}`);
  console.log(`Output: ${outputPath}`);
  if (args.album) {
    console.log(`Album:  ${args.album}`);
  }
  if (args.model) {
    console.log(`Model:  ${args.model}`);
  }
  console.log("");

  try {
    // Process OCR file
    const result = await processOcrFile(
      args.input,
      apiKey,
      args.album,
      args.model,
    );

    // Write output JSON
    console.log(`\nWriting output to: ${outputPath}`);
    await Bun.write(outputPath, JSON.stringify(result, null, 2));

    // Display summary
    console.log("\n" + "=".repeat(50));
    console.log("Translation Summary");
    console.log("=".repeat(50));
    console.log(`Total bubbles:      ${result.metadata.total_bubbles}`);
    console.log(`Translated:         ${result.metadata.translated_bubbles}`);
    console.log(`Skipped:            ${result.metadata.skipped_bubbles}`);
    console.log(`Total tokens used:  ${result.metadata.total_tokens}`);

    // Calculate estimated cost (approximate)
    const inputCost = (result.metadata.total_tokens * 0.4 * 3) / 1_000_000;
    const outputCost = (result.metadata.total_tokens * 0.6 * 15) / 1_000_000;
    const totalCost = inputCost + outputCost;
    console.log(`Estimated cost:     $${totalCost.toFixed(4)}`);
    console.log("=".repeat(50));
    console.log("\n✓ Translation complete!");
  } catch (error) {
    console.error(
      `\n✗ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    process.exit(1);
  }
}

main();
