import type { Panel } from "./types.ts";

/**
 * Orders panels in reading order (left-to-right, top-to-bottom)
 *
 * @param panels - Unordered array of panels
 * @param rowTolerance - Y-distance tolerance for same row detection (default: 20px)
 * @returns Ordered array of panels with sequential IDs
 */
export function orderPanels(panels: Panel[], rowTolerance = 20): Panel[] {
  if (panels.length === 0) {
    return [];
  }

  // Group panels into rows
  const rows = groupPanelsIntoRows(panels, rowTolerance);

  // Sort each row left-to-right
  const sortedRows = rows.map(sortRowLeftToRight);

  // Flatten and assign sequential IDs
  const orderedPanels: Panel[] = [];
  let id = 0;

  for (const row of sortedRows) {
    for (const panel of row) {
      orderedPanels.push({
        ...panel,
        id: id++,
      });
    }
  }

  return orderedPanels;
}

/**
 * Groups panels into rows based on Y-position tolerance
 *
 * @param panels - Array of panels
 * @param tolerance - Maximum Y-distance for panels in same row
 * @returns Array of panel rows
 */
function groupPanelsIntoRows(panels: Panel[], tolerance: number): Panel[][] {
  // Sort panels by Y position first
  const sortedByY = [...panels].sort((a, b) => a.y - b.y);

  const rows: Panel[][] = [];
  let currentRow: Panel[] = [];
  let rowY = sortedByY[0].y;

  for (const panel of sortedByY) {
    // Check if panel belongs to current row
    if (Math.abs(panel.y - rowY) <= tolerance) {
      currentRow.push(panel);
    } else {
      // Start a new row
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      currentRow = [panel];
      rowY = panel.y;
    }
  }

  // Add the last row
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Sorts panels within a row from left to right
 *
 * @param row - Array of panels in the same row
 * @returns Sorted array of panels
 */
function sortRowLeftToRight(row: Panel[]): Panel[] {
  return [...row].sort((a, b) => a.x - b.x);
}
