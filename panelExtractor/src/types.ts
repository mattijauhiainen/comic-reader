/**
 * Represents a single panel in a comic page
 */
export interface Panel {
  id: number; // Sequential panel ID (0-indexed)
  x: number; // X coordinate of top-left corner
  y: number; // Y coordinate of top-left corner
  width: number; // Panel width in pixels
  height: number; // Panel height in pixels
}

/**
 * Dimensions of an image
 */
export interface Dimensions {
  width: number; // Image width
  height: number; // Image height
}

/**
 * Metadata about the extraction process
 */
export interface ExtractionMetadata {
  extractedAt: string; // ISO timestamp
  algorithm: string; // Which algorithm was used
}

/**
 * Complete result of panel extraction from a comic page
 */
export interface PanelExtractionResult {
  imagePath: string; // Input image path
  dimensions: Dimensions; // Image dimensions
  panels: Panel[]; // Ordered array of panels
  metadata: ExtractionMetadata; // Extraction metadata
}

/**
 * Configuration options for the panel extraction algorithm
 */
export interface ExtractionOptions {
  threshold?: number; // Binarization threshold (0-255, default: 127)
  edgeMethod?: 'sobel' | 'canny'; // Edge detection algorithm (default: sobel)
  minPanelSize?: number; // Minimum panel dimension in pixels (default: 100)
  blurRadius?: number; // Gaussian blur radius in pixels (default: 2)
  rowTolerance?: number; // Y-distance tolerance for same row detection (default: 20)
  debug?: boolean; // Output debug visualization (default: false)
  outputPath?: string; // Custom output path for JSON file
}

/**
 * Raw projection data used for gutter detection
 */
export interface ProjectionData {
  horizontal: number[]; // Sum of pixel values for each row
  vertical: number[]; // Sum of pixel values for each column
}

/**
 * Represents a detected gutter (white space between panels)
 */
export interface Gutter {
  position: number; // Position (row or column index)
  width: number; // Width of the gutter
  isHorizontal: boolean; // True for horizontal gutter, false for vertical
}
