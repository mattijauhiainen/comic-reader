import sharp from "sharp";
import type {
  Dimensions,
  ExtractionOptions,
  Panel,
  PanelExtractionResult,
} from "./types.ts";
import { sobelEdgeDetection } from "./edges.ts";
import {
  findContours,
  filterContours,
  removeNestedContours,
  type Contour,
} from "./contours.ts";
import { orderPanels } from "./ordering.ts";

/**
 * Generates a debug image path by adding a suffix before the file extension
 *
 * @param inputPath - Original image path
 * @param suffix - Suffix to add (e.g., "1-preprocessed")
 * @returns Debug image path (e.g., "image-debug-1-preprocessed.png")
 */
function getDebugImagePath(inputPath: string, suffix: string): string {
  return inputPath.replace(/\.[^.]+$/, `-debug-${suffix}.png`);
}

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

  // Step 1: Preprocess the image
  console.log("Preprocessing image...");
  const preprocessed = await preprocessImage(image, options);

  // Debug: Save preprocessed image
  if (options.debug) {
    await saveDebugImage(preprocessed.data, preprocessed.width, preprocessed.height, imagePath, "1-preprocessed");
  }

  // Step 2: Apply edge detection
  console.log("Applying Sobel edge detection...");
  const edgeMap = sobelEdgeDetection(preprocessed.data, preprocessed.width, preprocessed.height);

  // Debug: Save edge map
  if (options.debug) {
    await saveDebugImage(edgeMap, preprocessed.width, preprocessed.height, imagePath, "2-edges");
  }

  // Step 3: Find contours
  console.log("Detecting contours...");
  let contours = findContours(edgeMap, preprocessed.width, preprocessed.height);
  console.log(`Found ${contours.length} contours`);

  // Debug: Draw all contours
  if (options.debug) {
    await drawContoursDebug(imagePath, contours, "3-all-contours");
  }

  // Step 4: Filter contours
  console.log("Filtering contours...");
  const minPanelSize = options.minPanelSize ?? 300;
  const maxWidthRatio = 0.95;
  const maxHeightRatio = 0.95;
  contours = filterContours(
    contours,
    minPanelSize,
    maxWidthRatio,
    maxHeightRatio,
    preprocessed.width,
    preprocessed.height
  );
  console.log(`${contours.length} contours after filtering`);

  // Debug: Draw filtered contours
  if (options.debug) {
    await drawContoursDebug(imagePath, contours, "4-filtered-contours");
  }

  // Step 5: Remove nested contours
  console.log("Removing nested contours...");
  contours = removeNestedContours(contours);
  console.log(`${contours.length} contours after removing nested`);

  // Debug: Draw final contours
  if (options.debug) {
    await drawContoursDebug(imagePath, contours, "5-final-contours");
  }

  // Step 6: Extract panel boundaries
  console.log("Extracting panel boundaries...");
  let panels = extractPanelBoundaries(contours);

  // Step 7: Order panels
  console.log("Ordering panels...");
  const rowTolerance = 20;
  panels = orderPanels(panels, rowTolerance);

  console.log(`✓ Detected ${panels.length} panels`);

  const result: PanelExtractionResult = {
    imagePath,
    dimensions,
    panels,
    metadata: {
      extractedAt: new Date().toISOString(),
    },
  };

  return result;
}

/**
 * Preprocesses the image for panel detection
 * (grayscale conversion, blur, binarization)
 *
 * @param image - Sharp image instance
 * @param options - Extraction options
 * @returns Preprocessed image data (pixel array and dimensions)
 */
async function preprocessImage(
  image: sharp.Sharp,
  options: ExtractionOptions
): Promise<{ data: Uint8Array; width: number; height: number }> {
  const blurRadius = 2;
  const threshold = 127;

  // Convert to grayscale and apply blur
  const processedImage = image
    .greyscale()
    .blur(blurRadius);

  // Get raw pixel data
  const { data, info } = await processedImage
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Binarize: convert to black (0) or white (255) based on threshold
  const binarized = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    binarized[i] = data[i] > threshold ? 255 : 0;
  }

  return {
    data: binarized,
    width: info.width,
    height: info.height,
  };
}

/**
 * Extracts panel boundaries from detected contours
 *
 * @param contours - Detected contours from edge detection
 * @returns Array of unordered panels (IDs will be assigned during ordering)
 */
function extractPanelBoundaries(contours: Contour[]): Panel[] {
  return contours.map((contour, index) => ({
    id: index, // Temporary ID, will be reassigned during ordering
    x: contour.boundingBox.x,
    y: contour.boundingBox.y,
    width: contour.boundingBox.width,
    height: contour.boundingBox.height,
  }));
}

/**
 * Saves a grayscale image buffer as a debug PNG file
 *
 * @param data - Grayscale pixel data
 * @param width - Image width
 * @param height - Image height
 * @param originalPath - Original image path
 * @param suffix - Suffix for debug filename
 */
async function saveDebugImage(
  data: Uint8Array,
  width: number,
  height: number,
  originalPath: string,
  suffix: string
): Promise<void> {
  const outputPath = getDebugImagePath(originalPath, suffix);

  await sharp(data, {
    raw: {
      width,
      height,
      channels: 1,
    },
  })
    .png()
    .toFile(outputPath);

  console.log(`  Debug image saved: ${outputPath}`);
}

/**
 * Draws contours on the original image for debugging
 *
 * @param imagePath - Original image path
 * @param contours - Contours to draw
 * @param suffix - Suffix for debug filename
 */
async function drawContoursDebug(
  imagePath: string,
  contours: Contour[],
  suffix: string
): Promise<void> {
  const image = sharp(imagePath);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    return;
  }

  // Generate SVG overlay with contour bounding boxes
  const svg = generateContoursSvg(contours, metadata.width, metadata.height);

  const outputPath = getDebugImagePath(imagePath, suffix);

  await image
    .composite([
      {
        input: Buffer.from(svg),
        top: 0,
        left: 0,
      },
    ])
    .toFile(outputPath);

  console.log(`  Debug image saved: ${outputPath} (${contours.length} contours)`);
}

/**
 * Generates an SVG overlay with contour bounding boxes
 */
function generateContoursSvg(
  contours: Contour[],
  width: number,
  height: number
): string {
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

  // Draw each contour bounding box
  for (const contour of contours) {
    const box = contour.boundingBox;
    svg += `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" `;
    svg += `fill="none" stroke="rgb(255,0,0)" stroke-width="2" />`;
  }

  svg += "</svg>";
  return svg;
}
