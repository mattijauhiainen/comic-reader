import type { Dimensions, Gutter, ProjectionData } from "./types.ts";

/**
 * Calculates horizontal and vertical projection data from image pixel data
 *
 * @param pixelData - Raw pixel data from preprocessed image
 * @param dimensions - Image dimensions
 * @returns Projection data for horizontal and vertical axes
 */
export function calculateProjections(
  pixelData: Uint8Array,
  dimensions: Dimensions,
): ProjectionData {
  // TODO: Implement projection calculation
  // - Sum pixel values for each row (horizontal projection)
  // - Sum pixel values for each column (vertical projection)
  throw new Error("Not implemented");
}

/**
 * Detects gutters (white spaces) from projection data
 *
 * @param projections - Horizontal and vertical projection data
 * @param dimensions - Image dimensions
 * @param threshold - Brightness threshold for gutter detection (0-255)
 * @param minGutterWidth - Minimum gutter width in pixels
 * @returns Detected horizontal and vertical gutters
 */
export function detectGutters(
  projections: ProjectionData,
  dimensions: Dimensions,
  threshold = 240,
  minGutterWidth = 5,
): { horizontal: Gutter[]; vertical: Gutter[] } {
  // TODO: Implement gutter detection
  // - Identify continuous white regions in projections
  // - Filter by brightness threshold
  // - Require minimum gutter width
  // - Require gutters to span at least 80% of perpendicular dimension
  throw new Error("Not implemented");
}

/**
 * Finds continuous white regions in a projection array
 *
 * @param projection - Single axis projection data
 * @param threshold - Brightness threshold
 * @param minWidth - Minimum region width
 * @param perpDimension - Perpendicular dimension for span checking
 * @returns Array of gutter positions
 */
function findWhiteRegions(
  projection: number[],
  threshold: number,
  minWidth: number,
  perpDimension: number,
): number[] {
  // TODO: Implement white region detection
  throw new Error("Not implemented");
}
