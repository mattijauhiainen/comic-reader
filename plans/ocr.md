# OCR Integration Plan

## Overview
Extend the OCR functionality to process detected text bubbles and integrate it into the comic processing pipeline. The OCR tool will read bubble detection JSON files, crop text regions, perform character recognition, and output a new JSON file with text annotations.

## Current State

### Bubble Detection (bubbleExtractor/extract.py)
- Uses model: `ogkalu/comic-text-and-bubble-detector`
- Detects three types of regions:
  - `label_id: 0` - bubble (speech bubble outline)
  - `label_id: 1` - text_bubble (text inside bubbles)
  - `label_id: 2` - text_free (free-floating text)
- Output format: `{page}-bubbles.json`
- Existing visualization: draws bounding boxes with labels and confidence

### OCR Prototype (ocr/test_ocr.py)
- Uses PaddleOCR with Traditional Chinese language support
- Currently processes a single test image
- Returns recognized text with confidence scores
- Simple standalone test script

## Proposed Architecture

### 1. OCR Processing Tool (ocr/run_ocr.py)

Create a new standalone script that:

**Input:**
- `--image`: Path to the comic page image file
- `--bubbles`: Path to the bubble detection JSON file (e.g., `page1-bubbles.json`)
- `--output`: Path for the output JSON file (default: `{image_stem}-ocr.json`)
- `--lang`: OCR language (default: `chinese_cht`)
- `--confidence-threshold`: Minimum confidence to include text (default: 0.5)

**Processing:**
1. Load the image using PIL/OpenCV
2. Read the bubble detection JSON
3. Filter detections to only include:
   - `label_id === 1` (text_bubble)
   - `label_id === 2` (text_free)
4. For each filtered detection:
   - Extract bounding box coordinates (x1, y1, x2, y2)
   - Crop the region from the original image
   - Run PaddleOCR on the cropped region
   - Collect recognized text lines and confidence scores
5. Generate output JSON with bubbles and their OCR results

**Output JSON Format:**
```json
{
  "image_info": {
    "path": "../reader/pizarro/page1.avif",
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
        "text_lines": [
          {
            "text": "這是第一行文字",
            "confidence": 0.9823
          },
          {
            "text": "這是第二行文字",
            "confidence": 0.9756
          }
        ],
        "full_text": "這是第一行文字\n這是第二行文字",
        "avg_confidence": 0.9790
      }
    }
  ],
  "ocr_config": {
    "lang": "chinese_cht",
    "model": "paddleocr",
    "version": "3.3.2",
    "confidence_threshold": 0.5
  },
  "source_bubble_file": "page1-bubbles.json",
  "processed_at": "2025-12-15T16:45:00Z"
}
```

**Key Implementation Details:**
- Use the same PaddleOCR initialization as test_ocr.py
- Handle edge cases:
  - Bounding boxes outside image bounds (clamp coordinates)
  - Very small regions (skip if width or height < 20 pixels)
  - OCR failures (store empty result with error field)
- Preserve original bubble detection metadata (confidence, label_id)
- Add OCR-specific metadata to track processing parameters

### 2. Update Dependencies

**ocr/pyproject.toml:**
```toml
[project]
name = "ocr"
version = "0.1.0"
description = "OCR processing for comic text bubbles"
readme = "README.md"
requires-python = ">=3.13"
dependencies = [
    "paddleocr>=3.3.2",
    "pillow>=10.0.0",
    "opencv-python>=4.8.0",
    "numpy>=1.24.0",
]
```

## Integration with Existing Pipeline

### Workflow
1. Run bubble detection:
   ```bash
   cd bubbleExtractor
   uv run python extract.py ../reader/pizarro/page1.avif --output-dir ../reader/pizarro
   ```
   Output: `page1-bubbles.json`, `page1-annotated.png`

2. Run OCR on detected bubbles:
   ```bash
   cd ocr
   uv run python run_ocr.py \
     --image ../reader/pizarro/page1.avif \
     --bubbles ../reader/pizarro/page1-bubbles.json \
     --output ../reader/pizarro/page1-ocr.json
   ```
   Output: `page1-ocr.json`

## Implementation Steps

### Step 1: Create OCR Processing Tool
- [ ] Create `ocr/run_ocr.py`
  - Implement argument parsing
  - Load and initialize PaddleOCR
  - Implement bubble JSON loading and filtering
  - Implement image cropping for each bubble
  - Implement OCR processing for each crop
  - Generate output JSON with ocr_result field
  - Add error handling for edge cases

### Step 2: Update Dependencies and Documentation
- [ ] Update `ocr/pyproject.toml` with new dependencies
- [ ] Run `uv sync` in ocr directory
- [ ] Update `ocr/README.md` with usage instructions
- [ ] Add example commands and expected outputs

### Step 3: Testing
- [ ] Test OCR tool with single page
- [ ] Verify JSON output format is correct
- [ ] Check OCR accuracy on sample bubbles
- [ ] Test edge cases:
  - Empty bubbles (no text detected)
  - Very small bounding boxes
  - Bounding boxes at image edges
  - Multiple text lines in single bubble

### Step 4: Optional Enhancements
- [ ] Create batch processing script
- [ ] Add support for multiple languages
- [ ] Implement text region preprocessing (deskewing, denoising)
- [ ] Add option to output plain text file in addition to JSON

## Technical Considerations

### OCR Performance Optimization
PaddleOCR initialization is slow (~2-3 seconds). For batch processing:
- Initialize OCR model once and reuse
- Consider adding `--use-gpu` flag if CUDA is available
- Cache model in memory for interactive use

### Coordinate System
Bubble detection JSON uses (x1, y1, x2, y2) format:
- x1, y1: top-left corner
- x2, y2: bottom-right corner

PIL crop expects (left, upper, right, lower), which maps directly:
```python
crop_box = (bbox['x1'], bbox['y1'], bbox['x2'], bbox['y2'])
cropped = image.crop(crop_box)
```

### Error Handling
The OCR tool should be robust:
1. File not found → Clear error message with path
2. Invalid JSON → Report JSON parsing error with line number
3. OCR failure on specific bubble → Skip and log warning, continue processing
4. Empty image crop → Skip with warning (bbox might be outside image bounds)
5. PaddleOCR crash → Catch exception, log error, save partial results

## Questions and Decisions

### Q: Should we include bubble (label_id: 0) in OCR processing?
**A:** No, only process text_bubble (1) and text_free (2) as confirmed.

### Q: Should the output JSON replace the bubble JSON or be separate?
**A:** Create a separate OCR JSON file. This allows:
- Running OCR independently after bubble detection
- Comparing bubble detection vs OCR results
- Re-running OCR with different parameters without re-detecting

### Q: What if OCR detects no text in a bubble?
**A:** Include the bubble in output with empty ocr_result:
```json
{
  "label": "text_bubble",
  "bbox": {...},
  "ocr_result": {
    "text_lines": [],
    "full_text": "",
    "avg_confidence": 0.0,
    "error": "No text detected"
  }
}
```

### Q: Should we preprocess crops before OCR?
**A:** Start simple without preprocessing. Later, consider adding:
- Binarization (threshold to black/white)
- Contrast enhancement
- Rotation correction
- Denoising

## Success Criteria

The implementation is complete when:
1. `run_ocr.py` successfully processes a bubble JSON and outputs OCR results in the correct JSON format
2. OCR tool handles edge cases gracefully without crashing
3. Documentation includes clear usage examples
4. Manual testing shows reasonable OCR accuracy (>80% for clear text)
5. Output JSON can be easily parsed and used for downstream processing

## Future Work (Out of Scope)

- Debug visualization tool to render OCR text on images
- Integration with static site generator to embed OCR text in HTML pages
- Interactive web viewer for editing OCR results
- Training custom OCR model for comic-specific fonts
- Reading order detection (sequence bubbles in reading order)
- Text translation pipeline (OCR → Translation → TTS)
