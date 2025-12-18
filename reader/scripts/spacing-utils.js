/**
 * Spacing utilities - read CSS variable values from JavaScript
 * Ensures single source of truth between CSS and JS
 */

/**
 * Get a spacing value from CSS variables
 * @param {number|string} level - The spacing level (0.5, 1, 2, 3, 4, 5)
 * @returns {number} - The spacing value in pixels
 */
export function getSpacing(level) {
  const rootStyles = getComputedStyle(document.documentElement);
  // Handle 0.5 as "0-5" in CSS variable name
  const varName = level === 0.5 ? '--spacing-0-5' : `--spacing-${level}`;
  const value = rootStyles.getPropertyValue(varName).trim();
  return parseInt(value, 10);
}

/**
 * Get the actual rendered height of an element
 * @param {string} selector - CSS selector for the element
 * @returns {number} - The height in pixels, or 0 if element not found
 */
export function getElementHeight(selector) {
  const element = document.querySelector(selector);
  if (!element) return 0;
  return element.offsetHeight;
}

/**
 * Get all spacing values as an object
 * @returns {Object} - Object with all spacing values
 */
export function getAllSpacing() {
  return {
    0.5: getSpacing(0.5), // 4px
    1: getSpacing(1),     // 8px
    2: getSpacing(2),     // 16px
    3: getSpacing(3),     // 24px
    4: getSpacing(4),     // 32px
    5: getSpacing(5),     // 40px
  };
}
