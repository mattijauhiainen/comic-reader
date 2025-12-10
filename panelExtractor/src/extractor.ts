import sharp from 'sharp';
import { detectGutters } from './projection.ts';
import { orderPanels } from './ordering.ts';
import type {
  PanelExtractionResult,
  ExtractionOptions,
  Panel,
  Dimensions,
} from './types.ts';

/**
 * Main entry point for panel extraction
 *
 * @param imagePath - Path to the comic page image
 * @param options - Extraction configuration options
 * @returns Panel extraction result with ordered panels
 */
export async function extractPanels(
  imagePath: string,
  options: ExtractionOptions = {}
): Promise<PanelExtractionResult> {
  // Load image and get metadata
  const image = sharp(imagePath);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to read image dimensions');
  }

  const dimensions: Dimensions = {
    width: metadata.width,
    height: metadata.height,
  };

  console.log(`Image dimensions: ${dimensions.width}x${dimensions.height}`);

  // TODO: Implement preprocessing (grayscale, blur)
  // TODO: Implement gutter detection
  // TODO: Implement panel boundary extraction
  // TODO: Implement panel ordering
  // TODO: Implement debug visualization if requested

  // Placeholder: Return entire image as single panel
  const panels: Panel[] = [
    {
      id: 0,
      x: 0,
      y: 0,
      width: dimensions.width,
      height: dimensions.height,
    },
  ];

  const result: PanelExtractionResult = {
    imagePath,
    dimensions,
    panels,
    metadata: {
      extractedAt: new Date().toISOString(),
      algorithm: 'projection',
    },
  };

  return result;
}

/**
 * Preprocesses the image for panel detection
 * (grayscale conversion, blur for noise reduction)
 *
 * @param image - Sharp image instance
 * @returns Preprocessed image buffer
 */
async function preprocessImage(image: sharp.Sharp): Promise<Buffer> {
  // TODO: Implement preprocessing
  // - Convert to grayscale
  // - Apply Gaussian blur (radius 2px)
  throw new Error('Not implemented');
}

/**
 * Extracts panel boundaries from detected gutters
 *
 * @param dimensions - Image dimensions
 * @param gutters - Detected horizontal and vertical gutters
 * @param options - Extraction options
 * @returns Array of unordered panels
 */
function extractPanelBoundaries(
  dimensions: Dimensions,
  horizontalGutters: number[],
  verticalGutters: number[],
  options: ExtractionOptions
): Panel[] {
  // TODO: Implement panel boundary extraction
  // - Use gutters to divide image into rectangles
  // - Filter out panels that are too small or too large
  throw new Error('Not implemented');
}
