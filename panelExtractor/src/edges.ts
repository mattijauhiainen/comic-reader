/**
 * Edge detection algorithms for panel boundary detection
 */

/**
 * Applies Sobel edge detection to a grayscale image
 *
 * @param data - Grayscale image pixel data
 * @param width - Image width
 * @param height - Image height
 * @returns Binary edge map (0 = no edge, 255 = edge)
 */
export function sobelEdgeDetection(
  data: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  // Sobel kernels for horizontal and vertical edges
  const sobelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ];

  const sobelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ];

  const edges = new Uint8Array(width * height);

  // Apply Sobel operator to each pixel (skip borders)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      // Convolve with Sobel kernels
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelIndex = (y + ky) * width + (x + kx);
          const pixelValue = data[pixelIndex];

          gx += pixelValue * sobelX[ky + 1][kx + 1];
          gy += pixelValue * sobelY[ky + 1][kx + 1];
        }
      }

      // Calculate gradient magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy);

      // Threshold to create binary edge map (using adaptive threshold)
      const index = y * width + x;
      edges[index] = magnitude > 50 ? 255 : 0;
    }
  }

  return edges;
}
