# Panel Extractor - Implementation Plan

## Overview

The panelExtractor is a TypeScript tool that analyzes comic book page images and extracts bounding box coordinates for each panel. This metadata enables the comic web reader to progressively zoom through panels in reading order.

## Requirements

### Functional Requirements
- Input: Single image file (comic book page)
- Output: JSON file with panel bounding boxes
- Reading order: Left-to-right, top-to-bottom
- Target layout: Traditional grid layouts with white gutters
- Runtime: Bun

### Technical Constraints
- Language: TypeScript
- Runtime: Bun
- Approach: Lightweight, pure TypeScript solution
- No ML dependencies or cloud APIs

## Technical Approach

### Primary Algorithm: Projection-Based Detection

For traditional grid layouts with white gutters, we'll use a projection-based approach:

1. **Image Preprocessing**
   - Load image using sharp
   - Convert to grayscale
   - Apply slight blur to reduce noise

2. **Projection Analysis**
   - Project pixel brightness values horizontally (sum each row)
   - Project pixel brightness values vertically (sum each column)
   - White gutters appear as peaks in projections
   - Detect continuous white regions above brightness threshold

3. **Gutter Detection**
   - Identify horizontal gutter lines (white rows spanning most of width)
   - Identify vertical gutter lines (white columns spanning most of height)
   - Filter out noise by requiring minimum gutter width/height

4. **Panel Boundary Extraction**
   - Use detected gutters to divide image into rectangular regions
   - Each region between gutters is a potential panel
   - Filter out regions that are too small or too large

5. **Panel Ordering**
   - Group panels by vertical position (within tolerance for same row)
   - Sort groups top-to-bottom
   - Within each row, sort panels left-to-right
   - Assign sequential IDs

## Project Structure

```
panelExtractor/
├── package.json           # Bun dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── README.md              # Usage documentation
├── src/
│   ├── index.ts          # CLI entry point
│   ├── extractor.ts      # Core panel detection logic
│   ├── projection.ts     # Projection-based algorithm
│   ├── ordering.ts       # Panel sorting logic
│   └── types.ts          # TypeScript type definitions
└── test/
    ├── test-images/      # Test comic pages
    └── expected/         # Expected output JSON files
```

## Dependencies

- **sharp**: Fast image processing library (loading, preprocessing, pixel access)
- **commander** (optional): CLI argument parsing

## Data Structures

### Panel Type
```typescript
interface Panel {
  id: number;           // Sequential panel ID (0-indexed)
  x: number;            // X coordinate of top-left corner
  y: number;            // Y coordinate of top-left corner
  width: number;        // Panel width in pixels
  height: number;       // Panel height in pixels
}
```

### Output Format
```typescript
interface PanelExtractionResult {
  imagePath: string;    // Input image path
  dimensions: {
    width: number;      // Image width
    height: number;     // Image height
  };
  panels: Panel[];      // Ordered array of panels
  metadata: {
    extractedAt: string;    // ISO timestamp
    algorithm: string;      // Which algorithm was used
    confidence?: number;    // Optional confidence score
  };
}
```

### Example Output
```json
{
  "imagePath": "comic-page-01.jpg",
  "dimensions": {
    "width": 1200,
    "height": 1800
  },
  "panels": [
    { "id": 0, "x": 50, "y": 50, "width": 550, "height": 400 },
    { "id": 1, "x": 650, "y": 50, "width": 500, "height": 400 },
    { "id": 2, "x": 50, "y": 500, "width": 1100, "height": 600 },
    { "id": 3, "x": 50, "y": 1150, "width": 550, "height": 600 },
    { "id": 4, "x": 650, "y": 1150, "width": 500, "height": 600 }
  ],
  "metadata": {
    "extractedAt": "2025-12-09T14:30:00Z",
    "algorithm": "projection"
  }
}
```

## CLI Interface

### Basic Usage
```bash
bun run extract <input-image> [options]
```

### Arguments
- `<input-image>`: Path to comic page image (required)

### Options
- `-o, --output <path>`: Output JSON file path (default: same name as input with .json extension)
- `--debug`: Output debug visualization showing detected panels
- `--min-panel-size <pixels>`: Minimum panel dimension (default: 100)
- `--gutter-threshold <0-255>`: Brightness threshold for gutter detection (default: 240)

### Examples
```bash
# Basic extraction
bun run extract page-01.jpg

# Custom output path
bun run extract page-01.jpg -o output/page-01-panels.json

# Debug mode (outputs image with bounding boxes drawn)
bun run extract page-01.jpg --debug
```

## Algorithm Parameters

### Tunable Parameters
- **Gutter brightness threshold**: 240 (out of 255)
- **Minimum gutter width**: 5 pixels
- **Minimum panel size**: 100x100 pixels
- **Maximum panel size**: 90% of image dimensions
- **Row tolerance**: 20 pixels (panels within this Y-distance are considered same row)

### Noise Reduction
- Apply Gaussian blur with radius 2px before analysis
- Require gutters to span at least 80% of perpendicular dimension
- Filter out panels smaller than minimum size

## Edge Cases and Limitations

### Known Edge Cases
1. **Bleeding panels**: Panel content extending into gutters
   - Mitigation: Use brightness threshold rather than pure white detection

2. **Irregular gutters**: Non-uniform gutter widths
   - Mitigation: Detect gutter centers rather than exact boundaries

3. **Splash pages**: Full-page single panel
   - Mitigation: If no gutters detected, return entire page as single panel

4. **Nested panels**: Panels within panels
   - Limitation: Current algorithm doesn't support this
   - Future: Could detect nested rectangles

5. **Non-rectangular panels**: Circular or irregular shapes
   - Limitation: Returns bounding box only
   - Acceptable: Bounding box still allows reader to zoom to region

### Out of Scope (Current Version)
- Manga/right-to-left reading order
- Rotated or skewed pages
- Double-page spreads
- Speech bubble detection
- Panel content classification

## Testing Strategy

### Unit Tests
- Projection calculation correctness
- Gutter detection with synthetic data
- Panel ordering logic

### Integration Tests
- Process test images with known panel layouts
- Compare output JSON against expected results
- Verify panel ordering is correct

### Manual Testing
- Debug visualization mode to inspect detected panels
- Test with various comic styles and layouts

## Implementation Phases

### Phase 1a: Framework
1. Set up project structure and dependencies
2. Configure TypeScript and Bun
3. Implement CLI argument parsing
4. Set up basic file I/O (read image, write JSON)
5. Create type definitions and interfaces
6. Stub out core algorithm functions

### Phase 1b: Core Functionality
1. Implement basic image loading and preprocessing
2. Implement projection-based gutter detection
3. Implement panel boundary extraction
4. Implement panel ordering logic
5. Basic testing with sample images

### Phase 2: Refinement
1. Add debug visualization mode
2. Comprehensive testing

## Success Criteria

The panelExtractor will be considered successful if it can:
- Produce panels in correct reading order
- Handle white gutters with minor content bleeding
- Provide clear error messages for unsupported layouts
- Output valid, well-structured JSON
