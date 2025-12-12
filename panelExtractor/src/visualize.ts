import sharp from "sharp";
import type { Panel } from "./types.ts";

/**
 * Draws panel bounding boxes on an image
 *
 * @param imagePath - Path to the original image
 * @param panels - Array of detected panels
 * @param outputPath - Path where to save the visualization
 */
export async function visualizePanels(
  imagePath: string,
  panels: Panel[],
  outputPath: string,
): Promise<void> {
  // Load the original image
  const image = sharp(imagePath);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Unable to read image dimensions");
  }

  // Generate SVG overlay with panel rectangles
  const svgOverlay = generateSvgOverlay(
    panels,
    metadata.width,
    metadata.height,
  );

  // Composite the SVG overlay on top of the original image
  await image
    .composite([
      {
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0,
      },
    ])
    .toFile(outputPath);

  console.log(`Visualization saved to: ${outputPath}`);
}

/**
 * Generates an SVG overlay with panel rectangles and labels
 */
function generateSvgOverlay(
  panels: Panel[],
  width: number,
  height: number,
): string {
  // Visualization constants
  const strokeWidth = 6;
  const strokeColor = { r: 255, g: 0, b: 0 }; // Red
  const showLabels = true;
  const labelSize = 24;

  const colorStr = `rgb(${strokeColor.r},${strokeColor.g},${strokeColor.b})`;

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

  // Draw each panel rectangle
  for (const panel of panels) {
    // Draw rectangle border
    svg += `<rect x="${panel.x}" y="${panel.y}" width="${panel.width}" height="${panel.height}" `;
    svg += `fill="none" stroke="${colorStr}" stroke-width="${strokeWidth}" />`;

    // Draw panel ID label if enabled
    if (showLabels) {
      const labelX = panel.x + 10;
      const labelY = panel.y + labelSize + 5;

      // Draw background for label (semi-transparent white)
      svg += `<rect x="${labelX - 5}" y="${labelY - labelSize}" `;
      svg += `width="${labelSize * 1.5}" height="${labelSize + 5}" `;
      svg += `fill="rgba(255,255,255,0.8)" />`;

      // Draw label text
      svg += `<text x="${labelX}" y="${labelY - 5}" `;
      svg += `font-family="Arial" font-size="${labelSize}" font-weight="bold" `;
      svg += `fill="${colorStr}">${panel.id}</text>`;
    }
  }

  svg += "</svg>";
  return svg;
}
