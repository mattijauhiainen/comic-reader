#!/usr/bin/env bun

import { Command } from "commander";
import { extractPanels } from "./extractor.ts";
import { visualizePanels } from "./visualize.ts";
import type { ExtractionOptions } from "./types.ts";

interface CliOptions {
  output?: string;
  debug?: boolean;
  minPanelSize: string;
  threshold: string;
  edgeMethod: string;
  blurRadius: string;
  rowTolerance: string;
}

const program = new Command();

program
  .name("panel-extractor")
  .description("Extract panel bounding boxes from comic book pages")
  .version("0.1.0")
  .argument("<input-image>", "Path to comic page image")
  .option("-o, --output <path>", "Output JSON file path")
  .option("--debug", "Output debug visualization showing detected panels and contours")
  .option("--min-panel-size <pixels>", "Minimum panel dimension", "100")
  .option(
    "--threshold <0-255>",
    "Binarization threshold for separating panels from gutters",
    "127",
  )
  .option(
    "--edge-method <sobel|canny>",
    "Edge detection algorithm",
    "sobel",
  )
  .option("--blur-radius <pixels>", "Gaussian blur radius for noise reduction", "2")
  .option("--row-tolerance <pixels>", "Y-distance tolerance for same row", "20")
  .action(async (inputImage: string, options: CliOptions) => {
    try {
      console.log(`Extracting panels from: ${inputImage}`);

      const extractionOptions: ExtractionOptions = {
        outputPath: options.output,
        debug: options.debug || false,
        minPanelSize: Number.parseInt(options.minPanelSize),
        threshold: Number.parseInt(options.threshold),
        edgeMethod: options.edgeMethod as 'sobel' | 'canny',
        blurRadius: Number.parseInt(options.blurRadius),
        rowTolerance: Number.parseInt(options.rowTolerance),
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
