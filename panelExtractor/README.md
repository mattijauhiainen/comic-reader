# Panel Extractor

A TypeScript tool that analyzes comic book page images and extracts bounding box coordinates for each panel. This metadata enables comic web readers to progressively zoom through panels in reading order.

## Features

- Projection-based panel detection algorithm
- Handles traditional grid layouts with white gutters
- Left-to-right, top-to-bottom panel ordering
- Debug visualization mode
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
- `--debug` - Output debug visualization showing detected panels
- `--min-panel-size <pixels>` - Minimum panel dimension (default: 100)
- `--gutter-threshold <0-255>` - Brightness threshold for gutter detection (default: 240)
- `--min-gutter-width <pixels>` - Minimum gutter width (default: 5)
- `--row-tolerance <pixels>` - Y-distance tolerance for same row (default: 20)

### Examples

```bash
# Custom output path
bun run extract page-01.jpg -o output/page-01-panels.json

# Debug mode (outputs image with bounding boxes drawn)
bun run extract page-01.jpg --debug

# Custom parameters
bun run extract page-01.jpg --min-panel-size 150 --gutter-threshold 230
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
    "algorithm": "projection"
  }
}
```

## Algorithm

The panel extractor uses a projection-based approach:

1. **Preprocessing**: Convert to grayscale and apply slight blur
2. **Projection Analysis**: Calculate horizontal and vertical pixel brightness projections
3. **Gutter Detection**: Identify white gutters as peaks in projection data
4. **Panel Extraction**: Divide image into rectangles using detected gutters
5. **Ordering**: Sort panels left-to-right, top-to-bottom

## Limitations

Current version supports:
- Traditional grid layouts with white gutters
- Left-to-right reading order
- Rectangular panel bounding boxes

Not yet supported:
- Manga/right-to-left reading order
- Rotated or skewed pages
- Double-page spreads
- Non-rectangular panels (returns bounding box only)

## Development Status

**Phase 1a: Framework** (COMPLETE)
- Project structure and dependencies
- TypeScript configuration
- CLI argument parsing
- Type definitions
- Stubbed core algorithm functions

**Phase 1b: Core Functionality** (TODO)
- Image preprocessing implementation
- Projection-based gutter detection
- Panel boundary extraction
- Panel ordering logic

**Phase 2: Refinement** (TODO)
- Debug visualization mode
- Comprehensive testing
