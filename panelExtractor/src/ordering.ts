import type { Panel } from "./types.ts";

/**
 * Orders panels in reading order (left-to-right, top-to-bottom)
 *
 * @param panels - Unordered array of panels
 * @param rowTolerance - Y-distance tolerance for same row detection (default: 20px)
 * @returns Ordered array of panels with sequential IDs
 */
export function orderPanels(panels: Panel[], rowTolerance = 20): Panel[] {
  // TODO: Implement panel ordering
  // - Group panels by vertical position (within tolerance for same row)
  // - Sort groups top-to-bottom
  // - Within each row, sort panels left-to-right
  // - Assign sequential IDs
  throw new Error("Not implemented");
}

/**
 * Groups panels into rows based on Y-position tolerance
 *
 * @param panels - Array of panels
 * @param tolerance - Maximum Y-distance for panels in same row
 * @returns Array of panel rows
 */
function groupPanelsIntoRows(panels: Panel[], tolerance: number): Panel[][] {
  // TODO: Implement row grouping
  throw new Error("Not implemented");
}

/**
 * Sorts panels within a row from left to right
 *
 * @param row - Array of panels in the same row
 * @returns Sorted array of panels
 */
function sortRowLeftToRight(row: Panel[]): Panel[] {
  // TODO: Implement left-to-right sorting
  throw new Error("Not implemented");
}
