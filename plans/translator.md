# Translator - Implementation Plan

## Overview

The translator is a TypeScript tool that processes OCR results from comic book pages and translates Chinese text to English using the Anthropic API. It provides comprehensive translation data including sentence-by-sentence breakdowns, vocabulary, and grammar points to aid language learning.

## Requirements

### Functional Requirements
- Input: OCR JSON file (e.g., `page1-ocr.json`)
- Output: Translation JSON file with detailed linguistic breakdown
- API: Anthropic REST API (Messages API)
- Runtime: Bun
- Language: Traditional Chinese to English

### Translation Output Requirements
For each text bubble, provide:
- Full text translation
- Sentence-by-sentence breakdown
- Key vocabulary with:
  - Traditional Chinese characters
  - Contextual English meaning
  - Jyutping romanization
- Grammar points (only when specific grammar patterns are present)

### Technical Constraints
- Language: TypeScript
- Runtime: Bun
- HTTP Client: Native `fetch` API (Bun has built-in fetch)
- Sanity check: Only process text containing Chinese characters

## Input/Output Format

### Input: OCR JSON Format
Based on existing OCR output (e.g., `assets/pizarro/page1-ocr.json`):

```json
{
  "image_info": {
    "path": "../assets/pizarro/page1.avif",
    "width": 3024,
    "height": 4032
  },
  "detections": [
    {
      "label": "text_bubble",
      "label_id": 1,
      "confidence": 0.9704,
      "bbox": {
        "x1": 1179.53,
        "y1": 1997.75,
        "x2": 1919.11,
        "y2": 2300.9
      },
      "ocr_result": {
        "text_lines": [...],
        "full_text": "狂妄到連首都都按他的名字重\n新命名為"塔比奥卡波利\n斯"。至於可憐的阿卡札爾，\n為了躲避搜捕，與他的追隨者\n藏到叢林中去了。",
        "avg_confidence": 0.9909
      }
    }
  ],
  "ocr_config": {...},
  "source_bubble_file": "page1-bubbles.json",
  "processed_at": "2025-12-15T16:45:00Z"
}
```

### Output: Translation JSON Format

```json
{
  "image_info": {
    "path": "../assets/pizarro/page1.avif",
    "width": 3024,
    "height": 4032
  },
  "translations": [
    {
      "bbox": {
        "x1": 1179.53,
        "y1": 1997.75,
        "x2": 1919.11,
        "y2": 2300.9
      },
      "original_text": "狂妄到連首都都按他的名字重\n新命名為...",
      "translation_result": {
        "chinese_text": "狂妄到連首都都按他的名字重新命名為...",
        "translation": "So arrogant that he even renamed the capital...",
        "sentences": [
          {
            "chinese_text": "狂妄到連首都都按他的名字重新命名為"塔比奥卡波利斯"。",
            "english_translation": "So arrogant that he renamed the capital...",
            "vocabulary": [
              {
                "word": "狂妄",
                "translation": "arrogant, presumptuous",
                "romanization": "kwong4 mong5"
              },
              {
                "word": "首都",
                "translation": "capital city",
                "romanization": "sau2 dou1"
              }
            ],
            "grammar_points": [
              {
                "pattern": "到連...都...",
                "explanation": "so... that even...",
                "example": "狂妄到連首都都按他的名字重新命名"
              }
            ]
          }
        ]
      },
      "api_metadata": {
        "model": "claude-sonnet-4-5-20250929",
        "tokens_used": {
          "input": 450,
          "output": 380
        }
      }
    }
  ],
  "metadata": {
    "source_ocr_file": "page1-ocr.json",
    "processed_at": "2025-12-17T10:30:00Z",
    "total_bubbles": 12,
    "translated_bubbles": 10,
    "skipped_bubbles": 2,
    "total_tokens": 8340
  }
}
```

## Technical Architecture

### Project Structure
```
translator/
├── src/
│   ├── index.ts           # Main CLI entry point
│   ├── translate.ts       # Core translation logic
│   ├── anthropic.ts       # Anthropic API client
│   ├── validators.ts      # Chinese text detection
│   └── types.ts           # TypeScript interfaces
├── package.json
├── tsconfig.json
└── README.md
```

### Core Components

#### 1. CLI Entry Point (`src/index.ts`)
```typescript
// Command-line argument parsing
// Usage: bun run src/index.ts --input page1-ocr.json --output page1-translation.json --album pizarro

interface CliArgs {
  input: string;      // Path to OCR JSON file
  output?: string;    // Optional output path (default: <input>-translation.json)
  album?: string;     // Optional album/comic name (e.g., "pizarro") - used in prompt context
  model?: string;     // Optional model (default: claude-sonnet-4-5-20250929)
}
```

Note: API key is loaded from `.env` file using Bun's built-in `process.env`

#### 2. Chinese Text Validator (`src/validators.ts`)
```typescript
// Sanity check: Verify text contains Chinese characters
function containsChinese(text: string): boolean {
  // Unicode range for Chinese characters (CJK Unified Ideographs)
  // \u4E00-\u9FFF: Common Chinese characters
  // \u3400-\u4DBF: Extension A
  const chineseRegex = /[\u4E00-\u9FFF\u3400-\u4DBF]/;
  return chineseRegex.test(text);
}
```

#### 3. Anthropic API Client (`src/anthropic.ts`)
```typescript
interface AnthropicResponse {
  chinese_text: string;
  translation: string;
  sentences: Array<{
    chinese_text: string;
    english_translation?: string;
    vocabulary: Array<{
      word: string;
      translation: string;
      romanization: string;
    }>;
    grammar_points?: Array<{
      pattern: string;
      explanation: string;
      example: string;
    }>;
  }>;
}

async function translateText(
  text: string,
  sourceComic: string,
  apiKey: string,
  model: string
): Promise<AnthropicResponse> {
  // Call Anthropic Messages API
  // POST https://api.anthropic.com/v1/messages
}
```

Key implementation details:
- Use `fetch()` to call the Anthropic API
- Request headers:
  - `x-api-key: <ANTHROPIC_API_KEY>`
  - `anthropic-version: 2023-06-01`
  - `content-type: application/json`
- Request body:
  ```json
  {
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 4096,
    "messages": [
      {
        "role": "user",
        "content": "<prompt with Chinese text>"
      }
    ]
  }
  ```
- Parse JSON from response content
- Extract token usage from response metadata

#### 4. Translation Orchestrator (`src/translate.ts`)
Main processing logic:
1. Load OCR JSON file
2. Iterate through `detections` array
3. For each detection with `ocr_result.full_text`:
   - Check if text contains Chinese characters
   - If yes: call Anthropic API for translation
   - If no: skip and log warning
4. Aggregate results into output JSON
5. Write to output file

Error handling:
- Skip bubbles with empty `full_text`
- Skip bubbles with no Chinese characters
- Retry API calls with exponential backoff (max 3 retries)
- Log API errors but continue processing remaining bubbles
- Track skipped bubbles in metadata

## Anthropic API Prompt Template

The prompt will be constructed as follows:

```
I want you to help me to create a translation aid for this comic book speech bubble text.{sourceContext}

For this text, give me back:
- The full text translated to English.
- The text sentence by sentence.
- Key vocabulary of each sentence.
- Grammar points of each sentence if there is specific grammar. Do not try to come up with grammar points if there isn't specific grammar in the sentence.

For the vocabulary, make sure you keep the chinese in the traditional chinese script. For the english meaning of words, show the english meaning that is relevant for the context. Also give the jyutping romanization of the word.

Give the response in JSON. Here is a sample JSON that I want you to match:

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
{full_text}
```

Notes:
- `{sourceContext}` is conditionally included only if `--album` argument is provided:
  - If provided: ` The text is from {album}.` (note the leading space)
  - If not provided: empty string (sentence ends with "text.")
- `{full_text}` is the `ocr_result.full_text` field
- The prompt requests JSON output, but Claude may wrap it in markdown code blocks
- Parser should handle both raw JSON and markdown-wrapped JSON (```json ... ```)

## Implementation Steps

### Step 1: Project Setup
- [ ] Initialize TypeScript project in `translator/` directory
- [ ] Create `package.json` with dependencies:
  - No external dependencies needed (use Bun built-ins)
  - Dev dependencies: `@types/bun`, `@types/node`
- [ ] Create `tsconfig.json` with Bun-compatible settings
- [ ] Create directory structure (`src/` folder)
- [ ] Create `.env.example` file in project root with:
  ```
  ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
  ```
- [ ] Add `.env` to `.gitignore` (if not already present)

### Step 2: Type Definitions
- [ ] Create `src/types.ts` with interfaces for:
  - OCR JSON structure (`OcrResult`, `Detection`, `BoundingBox`)
  - Translation JSON structure (`TranslationResult`, `Translation`)
  - Anthropic API types (`AnthropicRequest`, `AnthropicResponse`)

### Step 3: Chinese Text Validator
- [ ] Implement `src/validators.ts`
- [ ] Create `containsChinese()` function with regex test
- [ ] Add unit tests for edge cases:
  - Pure Chinese text
  - Mixed Chinese/English text
  - Pure English text
  - Empty strings
  - Newlines and whitespace

### Step 4: Anthropic API Client
- [ ] Implement `src/anthropic.ts`
- [ ] Create prompt template builder function
- [ ] Implement `translateText()` function:
  - Construct API request
  - Call Messages API using `fetch()`
  - Parse response (handle markdown code blocks)
  - Extract token usage
  - Error handling with retries
- [ ] Test with sample Chinese text

### Step 5: Translation Orchestrator
- [ ] Implement `src/translate.ts`
- [ ] Create `processOcrFile()` function:
  - Load and parse OCR JSON
  - Filter detections with valid text
  - Validate Chinese text presence
  - Call API for each bubble
  - Aggregate results
  - Generate metadata
- [ ] Implement progress logging (e.g., "Processing bubble 3/12...")

### Step 6: CLI Interface
- [ ] Implement `src/index.ts`
- [ ] Parse command-line arguments (use Bun's `process.argv`)
- [ ] Load API key from `process.env.ANTHROPIC_API_KEY` (Bun loads .env automatically)
- [ ] Handle optional `--album` argument for prompt context
- [ ] Call translation orchestrator
- [ ] Write output JSON to file
- [ ] Display summary statistics

### Step 7: Testing
- [ ] Test with single OCR file (e.g., `page1-ocr.json`)
- [ ] Verify output JSON format matches specification
- [ ] Check translation quality and vocabulary accuracy
- [ ] Test edge cases:
  - Empty OCR file (no detections)
  - Bubbles with no text
  - Bubbles with English-only text
  - API errors (invalid key, rate limits)
  - Very long text (>2000 characters)

### Step 8: Documentation
- [ ] Create `translator/README.md` with:
  - Installation instructions
  - Usage examples
  - API key setup
  - Sample input/output
  - Troubleshooting guide
- [ ] Add inline code comments for complex logic

### Step 9: Batch Processing Script
- [ ] Add `translate` script to root `package.json` following the project pattern:
  ```json
  "translate": "for f in assets/pizarro/*-ocr.json; do base=$(basename \"$f\" -ocr.json); bun run translator/src/index.ts --input \"$f\" --output \"assets/pizarro/${base}-translation.json\" --album pizarro; done"
  ```
- [ ] Test batch processing with multiple pages
- [ ] Note: API rate limiting is handled per-file (1-2 second delays between bubbles within a file)
- [ ] Consider adding delays between files if hitting rate limits (e.g., `&& sleep 2`)

## Configuration

### Environment Variables
Create a `.env` file in the project root (Bun loads this automatically):

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

A `.env.example` file is provided as a template. Copy it to `.env` and add your API key:
```bash
cp .env.example .env
# Edit .env and add your actual API key
```

Note: The `.env` file should be in `.gitignore` to prevent committing secrets.

## Usage Examples

### Basic Usage (Single File)
```bash
cd translator
bun run src/index.ts --input ../assets/pizarro/page1-ocr.json
# Output: ../assets/pizarro/page1-translation.json
```

### With Album Context
```bash
bun run src/index.ts \
  --input ../assets/pizarro/page1-ocr.json \
  --album pizarro
# Includes "The text is from pizarro." in the prompt
```

### Custom Output Path
```bash
bun run src/index.ts \
  --input ../assets/pizarro/page1-ocr.json \
  --output ../assets/pizarro/translations/page1.json \
  --album pizarro
```

### Batch Processing (From Project Root)
Add this script to the root `package.json`:
```json
{
  "scripts": {
    "translate": "for f in assets/pizarro/*-ocr.json; do base=$(basename \"$f\" -ocr.json); bun run translator/src/index.ts --input \"$f\" --output \"assets/pizarro/${base}-translation.json\" --album pizarro; done"
  }
}
```

Then run:
```bash
bun run translate
# Processes all *-ocr.json files in assets/pizarro/
```

## Error Handling

### API Errors
- **401 Unauthorized**: Invalid API key → Clear error message with setup instructions
- **429 Rate Limit**: Too many requests → Exponential backoff retry (1s, 2s, 4s)
- **500 Server Error**: Anthropic API issue → Retry up to 3 times
- **Network timeout**: Connection issue → Retry with longer timeout

### Input Validation Errors
- **File not found**: OCR file doesn't exist → Clear error with path
- **Invalid JSON**: Malformed OCR file → Show JSON parse error location
- **Missing fields**: OCR file missing required fields → List missing fields
- **No Chinese text**: All bubbles filtered out → Warning message with stats

### Output Errors
- **Write permission**: Cannot write output file → Check directory permissions
- **Disk space**: Out of space → Clear error message

## Performance Considerations

### API Rate Limits
Anthropic API limits (as of 2025):
- Rate limit: 50 requests per minute (tier-dependent)
- Token limit: varies by tier

For batch processing:
- Add delays between requests (1-2 seconds)
- Implement exponential backoff for rate limit errors
- Track and display token usage

### Cost Estimation
Model: `claude-sonnet-4-5-20250929`
- Input: ~$3 per million tokens
- Output: ~$15 per million tokens

Typical comic page:
- 10-15 text bubbles
- ~500 input tokens per bubble (prompt + text)
- ~300 output tokens per bubble (JSON response)
- Total: ~8,000 tokens per page
- Cost: ~$0.15 per page

## Success Criteria

The implementation is complete when:
1. Tool successfully processes OCR JSON and outputs translation JSON in correct format
2. Chinese text validator accurately filters non-Chinese bubbles
3. Anthropic API integration works with proper error handling and retries
4. Output includes all required fields (translation, vocabulary, grammar, bbox)
5. Documentation includes clear usage examples and troubleshooting
6. Manual review shows high-quality translations and vocabulary
7. Edge cases (empty files, API errors, mixed languages) are handled gracefully

## Future Enhancements (Out of Scope)

- Web UI for reviewing and editing translations
- Caching layer to avoid re-translating identical text
- Support for other Chinese romanization systems (Pinyin)
- Support for Simplified Chinese
- Translation quality scoring and confidence metrics
- Integration with comic reader to display translations on hover
- Export to Anki flashcard format for vocabulary study
- Multi-language support (Japanese, Korean)
