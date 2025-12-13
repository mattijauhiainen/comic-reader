import type { Panel } from "./types.ts";

/**
 * Orders panels in reading order (left-to-right, top-to-bottom)
 * Handles layouts with vertically stacked panels in the same column
 *
 * Example with vertically split panels:
 * ```
 * Layout:
 * ┌─┐┌───┐┌─┐
 * │1││   ││4│
 * ├─┤│ 3 │├─┤
 * │2││   ││5│
 * └─┘└───┘└─┘
 *
 * Step 1: Initial rows by top Y
 *   Row 1: [1, 3, 4]
 *   Row 2: [2, 5]
 *
 * Step 2: Merge rows (panel 3 spans both rows)
 *   Group 1: [1, 2, 3, 4, 5]
 *
 * Step 3: Identify columns by X
 *   Column 1: [1, 2]
 *   Column 2: [3]
 *   Column 3: [4, 5]
 *
 * Step 4: Sort columns left-to-right, panels top-to-bottom
 *   Result: 1 → 2 → 3 → 4 → 5
 * ```
 *
 * @param panels - Unordered array of panels
 * @param tolerance - Position tolerance for grouping
 * @returns Ordered array of panels with sequential IDs
 */
export function orderPanels(panels: Panel[], tolerance: number): Panel[] {
  if (panels.length === 0) {
    return [];
  }

  // 1. Initial row detection by top Y position
  const rows = groupPanelsIntoRows(panels, tolerance);

  // 2. Merge rows into row groups based on tallest panel heights
  const rowGroups = mergeRowsIntoGroups(rows);

  // 3. Within each row group, identify columns and order
  const orderedPanels: Panel[] = [];
  let id = 0;

  for (const rowGroup of rowGroups) {
    // Group by columns (X position)
    const columns = groupPanelsIntoColumns(rowGroup, tolerance);

    // Sort columns left-to-right
    const sortedColumns = columns.sort((a, b) => {
      const aMinX = Math.min(...a.map((p) => p.x));
      const bMinX = Math.min(...b.map((p) => p.x));
      return aMinX - bMinX;
    });

    // Within each column, sort top-to-bottom
    for (const column of sortedColumns) {
      const sortedColumn = [...column].sort((a, b) => a.y - b.y);
      for (const panel of sortedColumn) {
        orderedPanels.push({
          ...panel,
          id: id++,
        });
      }
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
 * Merges rows into row groups based on tallest panel heights
 * Rows that fall well within the vertical span of taller
 * panels are merged
 *
 * @param rows - Array of rows (panels grouped by initial Y position)
 * @returns Array of row groups
 */
function mergeRowsIntoGroups(rows: Panel[][]): Panel[][] {
  if (rows.length === 0) return [];

  const rowGroups: Panel[][] = [];
  let currentGroup: Panel[] = [...rows[0]];

  // Find the bottom of the current group (max Y + height of tallest panel)
  let groupBottom = getGroupingThreshold(currentGroup);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowTopY = Math.min(...row.map((p) => p.y));

    // If this row starts within the vertical span of the current group
    if (rowTopY <= groupBottom) {
      // Merge into current group
      currentGroup.push(...row);
      // Update group bottom in case new panels extend further
      groupBottom = getGroupingThreshold(currentGroup);
    } else {
      // Start a new group
      rowGroups.push(currentGroup);
      currentGroup = [...row];
      groupBottom = getGroupingThreshold(currentGroup);
    }
  }

  // Add the last group
  if (currentGroup.length > 0) {
    rowGroups.push(currentGroup);
  }

  return rowGroups;
}

/**
 * Gets the bottom Y position for considering merging rows into a group.
 * Use 80% of the height when considering if the next row should be
 * merged into this group to avoid accidentally grouping rows which over-
 * lap because e.g. the picture is a little bit skewed.
 *
 * @param panels - Array of panels
 * @returns Maximum Y + height value
 */
function getGroupingThreshold(panels: Panel[]): number {
  return Math.max(...panels.map((p) => p.y + p.height * 0.8));
}

/**
 * Groups panels into columns based on X-position tolerance
 *
 * @param panels - Array of panels
 * @param tolerance - Maximum X-distance for panels in same column
 * @returns Array of panel columns
 */
function groupPanelsIntoColumns(panels: Panel[], tolerance: number): Panel[][] {
  // Sort panels by X position first
  const sortedByX = [...panels].sort((a, b) => a.x - b.x);

  const columns: Panel[][] = [];
  let currentColumn: Panel[] = [];
  let columnX = sortedByX[0].x;

  for (const panel of sortedByX) {
    // Check if panel belongs to current column
    if (Math.abs(panel.x - columnX) <= tolerance) {
      currentColumn.push(panel);
    } else {
      // Start a new column
      if (currentColumn.length > 0) {
        columns.push(currentColumn);
      }
      currentColumn = [panel];
      columnX = panel.x;
    }
  }

  // Add the last column
  if (currentColumn.length > 0) {
    columns.push(currentColumn);
  }

  return columns;
}
