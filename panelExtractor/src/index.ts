#!/usr/bin/env bun

import { Command } from "commander";
import { extractPanels } from "./extractor.ts";
import { visualizePanels } from "./visualize.ts";
import type { ExtractionOptions } from "./types.ts";

interface CliOptions {
  output?: string;
  debug?: boolean;
  minPanelSize: string;
}

const program = new Command();

program
  .name("panel-extractor")
  .description("Extract panel bounding boxes from comic book pages")
  .version("0.1.0")
  .argument("<input-image>", "Path to comic page image")
  .option("-o, --output <path>", "Output JSON file path")
  .option("--debug", "Output debug visualization showing detected panels and contours")
  .option("--min-panel-size <pixels>", "Minimum panel dimension", "300")
  .action(async (inputImage: string, options: CliOptions) => {
    try {
      console.log(`Extracting panels from: ${inputImage}`);

      const extractionOptions: ExtractionOptions = {
        outputPath: options.output,
        debug: options.debug || false,
        minPanelSize: Number.parseInt(options.minPanelSize),
      };

      const result = await extractPanels(inputImage, extractionOptions);

      // Determine output path
      const outputPath =
        extractionOptions.outputPath || inputImage.replace(/\.[^.]+$/, ".json");

      // Write JSON output
      await Bun.write(outputPath, JSON.stringify(result, null, 2));

      console.log(`✓ Extracted ${result.panels.length} panels`);
      console.log(`✓ Output written to: ${outputPath}`);

      if (extractionOptions.debug) {
        const debugPath = inputImage.replace(/\.[^.]+$/, "-debug.png");
        await visualizePanels(inputImage, result.panels, debugPath);
        console.log(`✓ Debug visualization written to: ${debugPath}`);
      }
    } catch (error) {
      console.error("Error extracting panels:", error);
      process.exit(1);
    }
  });

program.parse();
