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

### Primary Algorithm: Contour-Based Detection

For comic layouts with irregular grids and varied panel sizes, we'll use a contour-based approach:

1. **Image Preprocessing**
   - Load image using sharp
   - Convert to grayscale
   - Apply Gaussian blur to reduce noise (radius ~2px)
   - Binarize image using threshold (convert to black/white)

2. **Edge Detection**
   - Apply edge detection algorithm (Sobel or Canny)
   - Produces binary edge map showing panel boundaries
   - Edges appear where panels meet gutters

3. **Contour Detection**
   - Find contours using border-following algorithm
   - Trace connected edge pixels to form closed shapes
   - Approximate contours to polygons using Douglas-Peucker algorithm
   - Filter for roughly rectangular shapes (4-6 vertices)

4. **Panel Boundary Extraction**
   - Convert each valid contour to bounding box (x, y, width, height)
   - Filter out panels that are too small (noise) or too large (false detections)
   - Remove nested panels (keep only outermost bounding box)
   - Handle overlapping panels by choosing the most rectangular one

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
│   ├── contours.ts       # Contour detection algorithm
│   ├── edges.ts          # Edge detection (Sobel/Canny)
│   ├── ordering.ts       # Panel sorting logic
│   └── types.ts          # TypeScript type definitions
└── test/
    ├── test-images/      # Test comic pages
    └── expected/         # Expected output JSON files
```

## Dependencies

- **sharp**: Fast image processing library (loading, preprocessing, pixel access)
- **commander** (optional): CLI argument parsing

**Note:** Edge detection and contour detection will be implemented in pure TypeScript without external dependencies. This keeps the tool lightweight and avoids native bindings.

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
    "algorithm": "contour"
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
- `--debug`: Output debug visualization showing detected panels and contours
- `--min-panel-size <pixels>`: Minimum panel dimension (default: 100)
- `--threshold <0-255>`: Binarization threshold (default: 127)
- `--edge-method <sobel|canny>`: Edge detection algorithm (default: sobel)

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
- **Binarization threshold**: 127 (out of 255) - separates panels from gutters
- **Gaussian blur radius**: 2 pixels - noise reduction before edge detection
- **Minimum panel size**: 100x100 pixels - filters out noise detections
- **Maximum panel size**: 90% of image dimensions - filters out false full-page detections
- **Contour approximation epsilon**: 0.02 * perimeter - polygon simplification tolerance
- **Rectangularity threshold**: 0.8 - minimum ratio of contour area to bounding box area
- **Row tolerance**: 20 pixels - panels within this Y-distance are considered same row

### Noise Reduction
- Apply Gaussian blur with radius 2px before edge detection
- Filter contours by minimum area (min panel size squared)
- Require contours to be roughly rectangular (4-6 vertices after approximation)
- Remove nested contours (keep outermost only)

## Edge Cases and Limitations

### Known Edge Cases
1. **Panels without clear borders**: Borderless or bleeding panels
   - Mitigation: Binarization helps create artificial edges from intensity changes
   - May require manual threshold adjustment

2. **Complex gutter patterns**: Decorative or textured gutters
   - Mitigation: Edge detection focuses on intensity changes, not patterns
   - Blur helps reduce texture noise

3. **Splash pages**: Full-page single panel
   - Mitigation: If no valid contours detected, return entire page as single panel
   - Fallback behavior ensures graceful handling

4. **Nested panels**: Panels within panels or insets
   - Limitation: Current algorithm removes nested contours
   - Returns outermost bounding box only
   - Future: Could preserve nested hierarchy if needed

5. **Non-rectangular panels**: Circular, diagonal, or irregular shapes
   - Limitation: Returns bounding box of contour
   - Acceptable: Bounding box still allows reader to zoom to region

6. **Very thin gutters**: Minimal spacing between panels
   - May be detected as single large panel
   - Mitigation: Adjust edge detection sensitivity and threshold

### Out of Scope (Current Version)
- Manga/right-to-left reading order
- Rotated or skewed pages
- Double-page spreads
- Speech bubble detection
- Panel content classification

## Testing Strategy

### Unit Tests
- Edge detection kernel application (Sobel, Canny)
- Contour tracing algorithm correctness
- Polygon approximation (Douglas-Peucker)
- Rectangularity filtering logic
- Panel ordering logic

### Integration Tests
- Process test images with known panel layouts
- Compare output JSON against expected results
- Verify panel ordering is correct
- Test edge cases (splash pages, irregular layouts, nested panels)

### Manual Testing
- Debug visualization mode to inspect detected contours and panels
- Test with various comic styles and layouts
- Test with different threshold values
- Validate with borderless panels and complex gutter patterns

## Implementation Phases

### Phase 1a: Framework
1. Set up project structure and dependencies
2. Configure TypeScript and Bun
3. Implement CLI argument parsing
4. Set up basic file I/O (read image, write JSON)
5. Create type definitions and interfaces
6. Stub out core algorithm functions

### Phase 1b: Core Functionality
1. Implement image loading and preprocessing (grayscale, blur, binarization)
2. Implement edge detection (Sobel operator)
3. Implement contour detection (border following algorithm)
4. Implement contour filtering (rectangularity, size constraints)
5. Implement panel ordering logic
6. Basic testing with sample images

### Phase 2: Refinement
1. Add Canny edge detection as alternative to Sobel
2. Add debug visualization mode (show contours and bounding boxes)
3. Implement nested contour removal
4. Add polygon approximation for better rectangle detection
5. Comprehensive testing with various comic layouts
6. Parameter tuning for different comic styles

## Success Criteria

The panelExtractor will be considered successful if it can:
- Detect panels in irregular grid layouts with varied sizes
- Produce panels in correct reading order
- Handle white gutters of different widths
- Work with borderless/bleeding panels through edge detection
- Gracefully handle splash pages and complex layouts
- Provide clear error messages for unsupported layouts
- Output valid, well-structured JSON
