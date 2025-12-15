# Bubble Extractor

Comic text and speech bubble detector using RT-DETR-v2 model.

## Overview

This tool detects and extracts text regions and speech bubbles from comic pages. It uses the [ogkalu/comic-text-and-bubble-detector](https://huggingface.co/ogkalu/comic-text-and-bubble-detector) model to identify three types of elements:

- **bubble**: Speech/thought bubble shapes
- **text_bubble**: Text inside bubbles
- **text_free**: Text outside bubbles

## Features

- Detects text and bubble regions with bounding boxes
- Exports detection results as structured JSON
- Generates annotated images with color-coded bounding boxes
- Configurable confidence threshold
- Optional cropped region extraction

## Installation

Using uv (recommended):

```bash
uv sync
```

## Usage

### Basic Usage

Process a comic page with default settings:

```bash
uv run extract.py ../reader/pizarro/page1.avif
```

This creates:
- `page1-bubbles.json` - Detection results
- `page1-annotated.png` - Visualization with bounding boxes

### Command-Line Options

```bash
uv run extract.py [IMAGE_PATH] [OPTIONS]

Options:
  --threshold FLOAT       Confidence threshold (default: 0.3)
  --output-dir PATH       Output directory (default: current directory)
  --save-crops            Save individual cropped regions
  --no-visualize          Skip creating annotated image
```

### Examples

Adjust confidence threshold:
```bash
uv run extract.py page1.avif --threshold 0.5
```

Save to specific directory:
```bash
uv run extract.py page1.avif --output-dir ./results
```

Extract individual regions as separate images:
```bash
uv run extract.py page1.avif --save-crops
```

## Output Format

### JSON Structure

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
      }
    }
  ],
  "model": "ogkalu/comic-text-and-bubble-detector",
  "threshold": 0.3
}
```

### Visualization

The annotated images use color-coded bounding boxes:
- **Magenta**: Speech/thought bubbles
- **Green**: Text inside bubbles
- **Orange**: Text outside bubbles

Each box is labeled with the detection type and confidence score.

## Dependencies

- opencv-python
- pillow
- transformers[torch]

## Model Information

- **Model**: RT-DETR-v2 r50vd
- **Training Data**: ~11k images from Manga, Webtoon, Manhua, and Western Comics
- **Parameters**: 42.9M
- **Input Size**: 640px (training)
