# Comic OCR Tool

OCR processing tool for extracting text from detected speech bubbles and text regions in comic pages.

## Overview

This tool takes an image file and a bubble detection JSON file (from the bubbleExtractor), crops out text regions, runs PaddleOCR character recognition, and outputs a JSON file with the recognized text and confidence scores.

## Features

- Processes text bubbles (`text_bubble`) and free-floating text (`text_free`) regions
- Uses PaddleOCR for Traditional Chinese character recognition
- Outputs structured JSON with text lines, confidence scores, and full text
- Handles edge cases gracefully (invalid crops, OCR failures, etc.)
- Configurable language and confidence threshold

## Installation

```bash
uv sync
```

## Usage

### Basic Usage

```bash
uv run python run_ocr.py \
  --image ../reader/pizarro/page2.avif \
  --bubbles ../bubbleExtractor/page2-bubbles.json
```

This will create `page2-ocr.json` in the same directory as the image.

### Full Options

```bash
uv run python run_ocr.py \
  --image <path-to-image> \
  --bubbles <path-to-bubble-json> \
  --output <output-json-path> \
  --lang chinese_cht \
  --confidence-threshold 0.5
```

### Arguments

- `--image` (required): Path to the comic page image file
- `--bubbles` (required): Path to the bubble detection JSON file
- `--output` (optional): Path for the output JSON file (default: `{image_stem}-ocr.json`)
- `--lang` (optional): OCR language (default: `chinese_cht`)
- `--confidence-threshold` (optional): Minimum confidence to include text (default: 0.5)

### Supported Languages

Common PaddleOCR language codes:
- `chinese_cht` - Traditional Chinese (default)
- `chinese_sim` - Simplified Chinese
- `en` - English
- `japan` - Japanese
- `korean` - Korean

See [PaddleOCR documentation](https://github.com/PaddlePaddle/PaddleOCR) for full list.

## Output Format

The tool outputs a JSON file with the following structure:

```json
{
  "image_info": {
    "path": "../reader/pizarro/page2.avif",
    "width": 3024,
    "height": 4032
  },
  "detections": [
    {
      "label": "text_bubble",
      "label_id": 1,
      "confidence": 0.964,
      "bbox": {
        "x1": 108.71,
        "y1": 1127.15,
        "x2": 1034.02,
        "y2": 1390.16
      },
      "ocr_result": {
        "text_lines": [
          {
            "text": "line1",
            "confidence": 0.9928
          },
          {
            "text": "line2",
            "confidence": 0.9862
          }
        ],
        "full_text": "line1\nline2",
        "avg_confidence": 0.9881
      }
    }
  ],
  "ocr_config": {
    "lang": "chinese_cht",
    "model": "paddleocr",
    "version": "3.3.2",
    "confidence_threshold": 0.5
  },
  "source_bubble_file": "../bubbleExtractor/page2-bubbles.json",
  "processed_at": "2025-12-15T17:00:00Z"
}
```

### Field Descriptions

- `image_info`: Original image metadata
- `detections`: Array of detected text regions with OCR results
  - `label`: Region type ("text_bubble" or "text_free")
  - `label_id`: Numeric label ID (1 or 2)
  - `confidence`: Bubble detection confidence
  - `bbox`: Bounding box coordinates (x1, y1, x2, y2)
  - `ocr_result`: OCR recognition results
    - `text_lines`: Array of recognized text lines with individual confidence scores
    - `full_text`: All text combined with newlines
    - `avg_confidence`: Average confidence across all lines
    - `error` (optional): Error message if OCR failed
- `ocr_config`: OCR processing configuration
- `source_bubble_file`: Path to the source bubble detection JSON
- `processed_at`: ISO 8601 timestamp of processing

## Example Workflow

1. Detect bubbles in a comic page:
   ```bash
   cd ../bubbleExtractor
   uv run python extract.py ../reader/pizarro/page2.avif --output-dir .
   ```

2. Run OCR on detected bubbles:
   ```bash
   cd ../ocr
   uv run python run_ocr.py \
     --image ../reader/pizarro/page2.avif \
     --bubbles ../bubbleExtractor/page2-bubbles.json
   ```

3. Use the resulting JSON for downstream processing (translation, TTS, etc.)

## Notes

- Only processes `text_bubble` (label_id: 1) and `text_free` (label_id: 2) regions
- Skips `bubble` (label_id: 0) regions as they don't contain text
- Very small regions (< 20px width or height) are automatically skipped
- Bounding boxes outside image bounds are clamped to valid coordinates
- OCR failures are captured in the output with error messages
- First run will download PaddleOCR models (~100MB) to `~/.paddlex/`

## Performance

- PaddleOCR initialization takes ~2-3 seconds
- OCR processing: ~0.5-1 second per text region
- For a typical comic page with 20-30 text bubbles: ~30-60 seconds total

## Troubleshooting

**Model download errors**: Check internet connection. Models are cached in `~/.paddlex/official_models/`

**Low OCR accuracy**: Try adjusting image preprocessing or using a different language model

**Out of memory**: For very high-resolution images, consider resizing before processing
