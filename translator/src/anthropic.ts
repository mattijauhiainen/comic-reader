import type { AnthropicResponse } from "./types";
import * as path from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const LOG_DIR = "logs";

interface AnthropicApiResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Replace quotation marks with Japanese corner brackets
 */
function replaceQuotesWithJapanese(text: string): string {
  let isOpening = true;

  return text.replace(/[""\u2018\u2019\u201C\u201D]/g, (match) => {
    // Handle fancy Unicode quotes
    if (match === '\u201C' || match === '\u2018') {
      return '「'; // Opening quote (" or ')
    }
    if (match === '\u201D' || match === '\u2019') {
      return '」'; // Closing quote (" or ')
    }

    // For ASCII quotes, alternate between opening and closing
    const replacement = isOpening ? '「' : '」';
    isOpening = !isOpening;
    return replacement;
  });
}

/**
 * Build the translation prompt with Chinese text
 */
function buildPrompt(text: string, album?: string): string {
  const sourceContext = album ? ` The text is from ${album}.` : "";

  // Replace quotation marks with Japanese quotes. Sonnet isn't very good at escaping
  // JSON and often comes up with responses where the text has unescaped quotation marks.
  // Work around this by replacing the quotes with Japanese quotes and call it a feature.
  const textWithJapaneseQuotes = replaceQuotesWithJapanese(text);

  return `I want you to help me to create a translation aid for this comic book speech bubble text.${sourceContext}

For this text, give me back:
- The full text translated to English.
- The text sentence by sentence.
- Key vocabulary of each sentence.
- Grammar points of each sentence if there is specific grammar. Do not try to come up with grammar points if there isn't specific grammar in the sentence.

For the vocabulary, make sure you keep the chinese in the traditional chinese script. For the english meaning of words, show the english meaning that is relevant for the context. Also give the jyutping romanization of the word.

Give the response in JSON. IMPORTANT: When the Chinese text contains quotation marks (like " " or " "), you must escape them properly in the JSON string values using backslashes (e.g., \\" or use the original Chinese quotes as-is but ensure they don't break the JSON structure). All string values must have properly escaped quotes.

Here is a sample JSON that I want you to match:

{
  "chinese_text": "<The original chinese text>",
  "translation": "<Full translation of the entire text into english>",
  "sentences": [
    {
      "chinese_text": "<The original chinese text for this sentence>",
      "english_translation": "<English translation of this sentence>",
      "vocabulary": [
        {
          "word": "<Chinese word>",
          "translation": "<The english meaning of the word in this context>",
          "romanization": "<Jyutping romanization of the word>"
        }
      ],
      "grammar_points": [
        {
          "pattern": "<Grammar pattern identified>",
          "explanation": "<Explanation of the grammar pattern>",
          "example": "<Example from the text>"
        }
      ]
    }
  ]
}

Here is the chinese text:
${textWithJapaneseQuotes}`;
}

/**
 * Log API response to file for debugging
 */
async function logApiResponse(
  bubbleNum: number,
  responseText: string,
  error?: string,
): Promise<void> {
  try {
    // Create logs directory if it doesn't exist
    if (!existsSync(LOG_DIR)) {
      mkdirSync(LOG_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `bubble-${bubbleNum}_${timestamp}.txt`;
    const filepath = path.join(LOG_DIR, filename);

    let logContent = `=== API Response for Bubble ${bubbleNum} ===\n`;
    logContent += `Timestamp: ${new Date().toISOString()}\n\n`;
    logContent += `--- Raw Response Text ---\n${responseText}\n\n`;

    if (error) {
      logContent += `--- Parse Error ---\n${error}\n`;
    }

    await Bun.write(filepath, logContent);
    console.log(`  📝 Logged response to: ${filepath}`);
  } catch (logError) {
    console.warn(`  ⚠️  Failed to log response: ${logError}`);
  }
}

/**
 * Fix common quote escaping issues in JSON strings
 */
function fixQuoteEscaping(jsonText: string): string {
  // This is a heuristic approach to fix unescaped Chinese quotes in JSON values
  // We look for patterns like: "text": "something"quote"something"
  // and replace with: "text": "something\"quote\"something"

  // Replace unescaped Chinese quotation marks within JSON string values
  // Match: "key": "value with " unescaped quotes"
  return jsonText.replace(
    /("(?:chinese_text|translation|english_translation|word|pattern|explanation|example)":\s*")((?:[^"\\]|\\.)*)(")/g,
    (match, prefix, content, suffix) => {
      // Escape Chinese quotation marks in the content
      const fixed = content
        .replace(/"/g, '\\"') // Left Chinese quote
        .replace(/"/g, '\\"') // Right Chinese quote
        .replace(/「/g, "\\「") // Japanese-style left quote
        .replace(/」/g, "\\」"); // Japanese-style right quote
      return prefix + fixed + suffix;
    },
  );
}

/**
 * Parse JSON from response text, handling markdown code blocks
 */
async function parseJsonResponse(
  text: string,
  bubbleNum?: number,
): Promise<AnthropicResponse> {
  // Remove markdown code blocks if present
  let jsonText = text.trim();

  // Check for markdown code block wrapper
  const markdownMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (markdownMatch) {
    jsonText = markdownMatch[1].trim();
  }

  // Try to extract JSON if there's text before/after
  // Look for the outermost { ... }
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch && jsonMatch.index !== undefined && jsonMatch.index > 0) {
    console.log(
      "  ⚠️  Found extra text before JSON, extracting JSON object only",
    );
    jsonText = jsonMatch[0];
  }

  try {
    return JSON.parse(jsonText) as AnthropicResponse;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    // Try to fix quote escaping and parse again
    try {
      console.log(
        "  ⚠️  JSON parse failed, attempting to fix quote escaping...",
      );
      const fixedJson = fixQuoteEscaping(jsonText);
      const result = JSON.parse(fixedJson) as AnthropicResponse;
      console.log("  ✓ Successfully parsed after fixing quotes");
      return result;
    } catch (fixError) {
      // Log the problematic response
      if (bubbleNum !== undefined) {
        await logApiResponse(bubbleNum, text, errorMsg);
      }

      // Include snippet of response in error
      const snippet = text.substring(0, 200);
      throw new Error(
        `Failed to parse JSON response: ${errorMsg}\nResponse snippet: ${snippet}...`,
      );
    }
  }
}

/**
 * Call Anthropic API with exponential backoff retry
 */
async function callAnthropicWithRetry(
  prompt: string,
  apiKey: string,
  model: string,
  attempt = 1,
): Promise<AnthropicApiResponse> {
  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(
        `Anthropic API error (${response.status}): ${errorText}`,
      );

      // Retry on rate limit or server errors
      if (
        (response.status === 429 || response.status >= 500) &&
        attempt < MAX_RETRIES
      ) {
        const delay = INITIAL_RETRY_DELAY * 2 ** (attempt - 1);
        console.warn(
          `  API error (${response.status}), retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return callAnthropicWithRetry(prompt, apiKey, model, attempt + 1);
      }

      throw error;
    }

    return (await response.json()) as AnthropicApiResponse;
  } catch (error) {
    // Retry on network errors
    if (attempt < MAX_RETRIES && error instanceof Error) {
      const delay = INITIAL_RETRY_DELAY * 2 ** (attempt - 1);
      console.warn(
        `  Network error, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callAnthropicWithRetry(prompt, apiKey, model, attempt + 1);
    }
    throw error;
  }
}

/**
 * Translate Chinese text using Anthropic API
 */
export async function translateText(
  text: string,
  apiKey: string,
  album?: string,
  model: string = DEFAULT_MODEL,
  bubbleNum?: number,
  debug?: boolean,
): Promise<{
  translation: AnthropicResponse;
  tokens: { input: number; output: number };
}> {
  const prompt = buildPrompt(text, album);

  // In debug mode, just log the prompt and return mock data
  if (debug) {
    console.log("\n" + "=".repeat(80));
    console.log(`DEBUG: Prompt for bubble ${bubbleNum || "unknown"}`);
    console.log("=".repeat(80));
    console.log(prompt);
    console.log("=".repeat(80) + "\n");

    // Return mock response
    return {
      translation: {
        chinese_text: text,
        translation: "[DEBUG MODE - NO TRANSLATION]",
        sentences: [],
      },
      tokens: { input: 0, output: 0 },
    };
  }

  const apiResponse = await callAnthropicWithRetry(prompt, apiKey, model);

  // Extract text content from response
  const textContent = apiResponse.content.find((c) => c.type === "text");
  if (!textContent) {
    throw new Error("No text content in API response");
  }

  // Log all responses for debugging
  if (bubbleNum !== undefined) {
    await logApiResponse(bubbleNum, textContent.text);
  }

  const translation = await parseJsonResponse(textContent.text, bubbleNum);

  return {
    translation,
    tokens: {
      input: apiResponse.usage.input_tokens,
      output: apiResponse.usage.output_tokens,
    },
  };
}
