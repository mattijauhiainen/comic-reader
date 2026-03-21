import { translateText } from "./anthropic";
import type {
  OcrJson,
  TranslationJson,
  TranslationResult,
  TranslationMetadata,
} from "./types";
import { containsChinese } from "./validators";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";

/**
 * Load cached translations from an existing output file, keyed by original_text
 */
function loadCachedTranslations(
  outputPath: string,
): Map<string, TranslationResult> {
  if (!existsSync(outputPath)) {
    return new Map();
  }

  try {
    const file = Bun.file(outputPath);
    const data = JSON.parse(
      readFileSync(outputPath, "utf-8"),
    ) as TranslationJson;
    const cache = new Map<string, TranslationResult>();
    for (const t of data.translations) {
      cache.set(t.original_text, t);
    }
    console.log(`Loaded ${cache.size} cached translations from ${outputPath}`);
    return cache;
  } catch (error) {
    console.warn(
      `Failed to load cache from ${outputPath}, starting fresh: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return new Map();
  }
}

/**
 * Write current translation state to the output file
 */
async function writeOutput(
  outputPath: string,
  ocrData: OcrJson,
  translations: TranslationResult[],
  inputPath: string,
  totalBubbles: number,
  translatedBubbles: number,
  skippedBubbles: number,
): Promise<void> {
  const metadata: TranslationMetadata = {
    source_ocr_file: path.basename(inputPath),
    processed_at: new Date().toISOString(),
    total_bubbles: totalBubbles,
    translated_bubbles: translatedBubbles,
    skipped_bubbles: skippedBubbles,
  };

  const output: TranslationJson = {
    image_info: ocrData.image_info,
    translations,
    metadata,
  };

  await Bun.write(outputPath, JSON.stringify(output, null, 2));
}

/**
 * Process an OCR JSON file and translate all Chinese text bubbles
 */
export async function processOcrFile(
  inputPath: string,
  outputPath: string,
  apiKey: string,
  album?: string,
  model?: string,
  debug?: boolean,
  useCli?: boolean,
): Promise<TranslationJson> {
  // Load and parse OCR JSON
  console.log(`Loading OCR file: ${inputPath}`);
  const file = Bun.file(inputPath);
  const ocrData: OcrJson = await file.json();

  // Load cached translations from previous run
  const cache = debug ? new Map() : loadCachedTranslations(outputPath);

  const translations: TranslationResult[] = [];
  let totalBubbles = 0;
  let translatedBubbles = 0;
  let skippedBubbles = 0;

  // Filter detections with valid OCR results
  const validDetections = ocrData.detections.filter(
    (d) => d.ocr_result?.full_text && d.ocr_result.full_text.trim().length > 0,
  );

  totalBubbles = validDetections.length;
  console.log(`Found ${totalBubbles} text bubbles to process`);

  // Process each detection
  for (let i = 0; i < validDetections.length; i++) {
    const detection = validDetections[i];
    const bubbleNum = i + 1;
    const fullText = detection.ocr_result.full_text;

    console.log(
      `\nProcessing bubble ${bubbleNum}/${totalBubbles} (${detection.label})...`,
    );

    // Sanity check: only process Chinese text
    if (!containsChinese(fullText)) {
      console.log("  ⚠️  Skipping: No Chinese characters detected");
      skippedBubbles++;
      continue;
    }

    // Check cache for existing translation
    const cached = cache.get(fullText);
    if (cached) {
      console.log("  ✓ Using cached translation");
      translations.push({
        bbox: detection.bbox,
        original_text: fullText,
        translation_result: cached.translation_result,
        api_metadata: cached.api_metadata,
      });
      translatedBubbles++;
      continue;
    }

    try {
      // Call Anthropic API or CLI
      console.log(
        debug ? "  🐛 Debug mode: Logging prompt..." : "  🔄 Translating...",
      );
      const result = await translateText(
        fullText,
        apiKey,
        album,
        model,
        bubbleNum,
        debug,
        useCli,
      );

      // Store translation result
      translations.push({
        bbox: detection.bbox,
        original_text: fullText,
        translation_result: result.translation,
        api_metadata: {
          model: model || "claude-sonnet-4-5-20250929",
          tokens_used: result.tokens,
        },
      });

      translatedBubbles++;
      console.log("  ✓ Translated");

      // Write intermediate results so progress is not lost
      if (!debug) {
        await writeOutput(
          outputPath,
          ocrData,
          translations,
          inputPath,
          totalBubbles,
          translatedBubbles,
          skippedBubbles,
        );
      }

      // Add a small delay between requests to be respectful of API limits
      if (bubbleNum < totalBubbles) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(
        `  ✗ Error translating bubble ${bubbleNum}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      skippedBubbles++;
    }
  }

  // Build final output
  const metadata: TranslationMetadata = {
    source_ocr_file: path.basename(inputPath),
    processed_at: new Date().toISOString(),
    total_bubbles: totalBubbles,
    translated_bubbles: translatedBubbles,
    skipped_bubbles: skippedBubbles,
  };

  const output: TranslationJson = {
    image_info: ocrData.image_info,
    translations,
    metadata,
  };

  return output;
}
