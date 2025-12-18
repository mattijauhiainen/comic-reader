import { translateText } from "./anthropic";
import type {
  OcrJson,
  TranslationJson,
  TranslationResult,
  TranslationMetadata,
} from "./types";
import { containsChinese } from "./validators";
import * as path from "node:path";

/**
 * Process an OCR JSON file and translate all Chinese text bubbles
 */
export async function processOcrFile(
  inputPath: string,
  apiKey: string,
  album?: string,
  model?: string,
  debug?: boolean,
): Promise<TranslationJson> {
  // Load and parse OCR JSON
  console.log(`Loading OCR file: ${inputPath}`);
  const file = Bun.file(inputPath);
  const ocrData: OcrJson = await file.json();

  const translations: TranslationResult[] = [];
  let totalBubbles = 0;
  let translatedBubbles = 0;
  let skippedBubbles = 0;
  let totalTokens = 0;

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

    try {
      // Call Anthropic API
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

      totalTokens += result.tokens.input + result.tokens.output;
      translatedBubbles++;

      console.log(
        `  ✓ Translated (${result.tokens.input + result.tokens.output} tokens)`,
      );

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

  // Generate metadata
  const metadata: TranslationMetadata = {
    source_ocr_file: path.basename(inputPath),
    processed_at: new Date().toISOString(),
    total_bubbles: totalBubbles,
    translated_bubbles: translatedBubbles,
    skipped_bubbles: skippedBubbles,
    total_tokens: totalTokens,
  };

  // Build output JSON
  const output: TranslationJson = {
    image_info: ocrData.image_info,
    translations,
    metadata,
  };

  return output;
}
