# Panel Extractor

A TypeScript tool that analyzes comic book page images and extracts bounding box coordinates for each panel. This metadata enables comic web readers to progressively zoom through panels in reading order.

## Features

- Contour-based panel detection algorithm
- Handles irregular grid layouts with varied panel sizes
- Left-to-right, top-to-bottom panel ordering
- Debug visualization mode with panel boundaries and IDs
- JSON output format

## Installation

```bash
bun install
```

## Usage

### Basic Extraction

```bash
bun run extract <input-image>
```

Example:
```bash
bun run extract page-01.jpg
```

### CLI Options

- `-o, --output <path>` - Output JSON file path (default: same name as input with .json extension)
- `--debug` - Output debug visualization showing detected panels and contours
- `--min-panel-size <pixels>` - Minimum panel dimension (default: 100)
- `--threshold <0-255>` - Binarization threshold for separating panels from gutters (default: 127)
- `--edge-method <sobel|canny>` - Edge detection algorithm (default: sobel)
- `--blur-radius <pixels>` - Gaussian blur radius for noise reduction (default: 2)
- `--row-tolerance <pixels>` - Y-distance tolerance for same row (default: 20)

### Examples

```bash
# Custom output path
bun run extract page-01.jpg -o output/page-01-panels.json

# Debug mode (outputs image with bounding boxes drawn)
bun run extract page-01.jpg --debug

# Custom parameters
bun run extract page-01.jpg --min-panel-size 150 --threshold 140

# Use Canny edge detection instead of Sobel
bun run extract page-01.jpg --edge-method canny
```

## Output Format

The tool generates a JSON file with the following structure:

```json
{
  "imagePath": "comic-page-01.jpg",
  "dimensions": {
    "width": 1200,
    "height": 1800
  },
  "panels": [
    { "id": 0, "x": 50, "y": 50, "width": 550, "height": 400 },
    { "id": 1, "x": 650, "y": 50, "width": 500, "height": 400 }
  ],
  "metadata": {
    "extractedAt": "2025-12-09T14:30:00Z",
    "algorithm": "contour"
  }
}
```

## Algorithm

The panel extractor uses a contour-based approach:

1. **Preprocessing**: Convert to grayscale, apply Gaussian blur, and binarize
2. **Edge Detection**: Apply Sobel or Canny edge detection to find panel boundaries
3. **Contour Detection**: Trace connected edge pixels to form closed shapes
4. **Panel Extraction**: Convert contours to bounding boxes, filter by size and rectangularity
5. **Ordering**: Sort panels left-to-right, top-to-bottom

## Limitations

Current version supports:
- Irregular grid layouts with varied panel sizes
- Left-to-right reading order
- Rectangular panel bounding boxes
- Borderless and bleeding panels (via edge detection)

Not yet supported:
- Manga/right-to-left reading order
- Rotated or skewed pages
- Double-page spreads
- Non-rectangular panels (returns bounding box only)
- Nested panels (returns outermost bounding box)

## Development Status

**Phase 1a: Framework** (COMPLETE)
- Project structure and dependencies
- TypeScript configuration
- CLI argument parsing
- Type definitions
- Stubbed core algorithm functions
- Debug visualization mode

**Phase 1b: Core Functionality** (TODO)
- Image preprocessing implementation (grayscale, blur, binarization)
- Edge detection (Sobel and Canny)
- Contour detection and tracing
- Panel boundary extraction from contours
- Panel ordering logic

**Phase 2: Refinement** (TODO)
- Polygon approximation for better rectangle detection
- Nested contour removal
- Comprehensive testing with various comic layouts
- Parameter tuning
