/**
 * Contour detection and tracing algorithms
 */

export interface Point {
  x: number;
  y: number;
}

export interface Contour {
  points: Point[];
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

type BoundingBox = Contour['boundingBox'];

/**
 * Calculates the intersection area of two bounding boxes
 *
 * @param a - First bounding box
 * @param b - Second bounding box
 * @returns Intersection area in pixels, or 0 if no overlap
 */
function getIntersectionArea(a: BoundingBox, b: BoundingBox): number {
  const intersectX = Math.max(a.x, b.x);
  const intersectY = Math.max(a.y, b.y);
  const intersectX2 = Math.min(a.x + a.width, b.x + b.width);
  const intersectY2 = Math.min(a.y + a.height, b.y + b.height);

  // No overlap if intersection is invalid
  if (intersectX >= intersectX2 || intersectY >= intersectY2) {
    return 0;
  }

  return (intersectX2 - intersectX) * (intersectY2 - intersectY);
}

/**
 * Merges two bounding boxes into one that encompasses both
 *
 * @param a - First bounding box
 * @param b - Second bounding box
 * @returns New bounding box that contains both input boxes
 */
function mergeBoundingBoxes(a: BoundingBox, b: BoundingBox): BoundingBox {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Finds contours in a binary edge image using border following
 *
 * @param edgeMap - Binary edge image (0 = background, 255 = edge)
 * @param width - Image width
 * @param height - Image height
 * @returns Array of detected contours
 */
export function findContours(
  edgeMap: Uint8Array,
  width: number,
  height: number
): Contour[] {
  const visited = new Uint8Array(width * height);
  const contours: Contour[] = [];

  // Scan the image to find edge starting points
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;

      // Found an unvisited edge pixel
      if (edgeMap[index] === 255 && visited[index] === 0) {
        const contour = traceContour(edgeMap, visited, width, height, x, y);

        // Only keep contours with sufficient points
        if (contour.points.length > 20) {
          contours.push(contour);
        }
      }
    }
  }

  return contours;
}

/**
 * Traces a contour starting from a given point using Moore-neighbor tracing
 *
 * @param edgeMap - Binary edge image
 * @param visited - Visited pixels tracker
 * @param width - Image width
 * @param height - Image height
 * @param startX - Starting X coordinate
 * @param startY - Starting Y coordinate
 * @returns Traced contour
 */
function traceContour(
  edgeMap: Uint8Array,
  visited: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number
): Contour {
  const points: Point[] = [];

  // 8-connected neighbors (clockwise from top)
  const dx = [0, 1, 1, 1, 0, -1, -1, -1];
  const dy = [-1, -1, 0, 1, 1, 1, 0, -1];

  let x = startX;
  let y = startY;
  let minX = x;
  let maxX = x;
  let minY = y;
  let maxY = y;

  // Use flood fill to find all connected edge pixels
  const queue: Point[] = [{ x, y }];
  visited[y * width + x] = 1;

  while (queue.length > 0) {
    const current = queue.shift()!;
    points.push(current);

    // Update bounding box
    minX = Math.min(minX, current.x);
    maxX = Math.max(maxX, current.x);
    minY = Math.min(minY, current.y);
    maxY = Math.max(maxY, current.y);

    // Check all 8 neighbors
    for (let i = 0; i < 8; i++) {
      const nx = current.x + dx[i];
      const ny = current.y + dy[i];

      // Check bounds
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIndex = ny * width + nx;

        // If neighbor is an edge and not visited
        if (edgeMap[nIndex] === 255 && visited[nIndex] === 0) {
          visited[nIndex] = 1;
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  return {
    points,
    boundingBox: {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
  };
}

/**
 * Filters contours by size and rectangularity
 *
 * @param contours - Array of contours
 * @param minSize - Minimum panel dimension
 * @param maxWidthRatio - Maximum width as ratio of image width
 * @param maxHeightRatio - Maximum height as ratio of image height
 * @param imageWidth - Image width
 * @param imageHeight - Image height
 * @returns Filtered contours
 */
export function filterContours(
  contours: Contour[],
  minSize: number,
  maxWidthRatio: number,
  maxHeightRatio: number,
  imageWidth: number,
  imageHeight: number
): Contour[] {
  const maxWidth = imageWidth * maxWidthRatio;
  const maxHeight = imageHeight * maxHeightRatio;

  return contours.filter((contour) => {
    const { width, height } = contour.boundingBox;

    // Filter by size
    if (width < minSize || height < minSize) {
      return false;
    }

    // Filter by maximum size (avoid detecting entire page as panel)
    if (width > maxWidth || height > maxHeight) {
      return false;
    }

    return true;
  });
}

/**
 * Removes nested contours, keeping only the outermost ones
 *
 * @param contours - Array of contours
 * @returns Contours with nested ones removed
 */
export function removeNestedContours(contours: Contour[]): Contour[] {
  let result = [...contours];
  let mergedCount = 0;
  let changed = true;

  // Keep merging until no more merges are possible
  while (changed) {
    changed = false;
    const newResult: Contour[] = [];

    for (const contour of result) {
      let merged = false;

      // Check if this contour overlaps with any contour in newResult
      for (let i = 0; i < newResult.length; i++) {
        if (hasSignificantOverlap(contour, newResult[i])) {
          // Merge the two contours
          newResult[i] = mergeContours(contour, newResult[i]);
          merged = true;
          changed = true;
          mergedCount++;
          break;
        }
      }

      // If not merged, add as new contour
      if (!merged) {
        newResult.push(contour);
      }
    }

    result = newResult;
  }

  console.log(`  Merged ${mergedCount} overlapping contours in multiple passes`);
  return result;
}

/**
 * Merges two contours by creating a bounding box that encompasses both
 */
function mergeContours(a: Contour, b: Contour): Contour {
  return {
    points: [...a.points, ...b.points], // Combine all points
    boundingBox: mergeBoundingBoxes(a.boundingBox, b.boundingBox),
  };
}

/**
 * Checks if two contours have significant overlap (>20% of smaller contour)
 */
function hasSignificantOverlap(a: Contour, b: Contour): boolean {
  const aBox = a.boundingBox;
  const bBox = b.boundingBox;

  const intersectionArea = getIntersectionArea(aBox, bBox);

  // No overlap
  if (intersectionArea === 0) {
    return false;
  }

  // Calculate areas
  const areaA = aBox.width * aBox.height;
  const areaB = bBox.width * bBox.height;
  const smallerArea = Math.min(areaA, areaB);

  // If intersection covers more than 20% of the smaller contour, consider it overlapping
  const overlapRatio = intersectionArea / smallerArea;
  return overlapRatio > 0.2;
}
