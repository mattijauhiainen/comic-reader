/**
 * Translation Bubbles
 * Renders clickable overlays for translations and manages interaction
 */

import { TranslationOverlayManager } from './translation-overlay.js';

let translationOverlayManager = null;
let translationBubbleElements = [];

/**
 * Calculate the rendered image dimensions and position
 * (Same logic as bubble-debug.js)
 */
function getImageRenderInfo() {
  const img = document.querySelector(".viewport img");
  const viewport = document.querySelector(".viewport");

  if (!img || !viewport) {
    return null;
  }

  const viewportRect = viewport.getBoundingClientRect();
  const imgRect = img.getBoundingClientRect();

  return {
    viewportWidth: viewportRect.width,
    viewportHeight: viewportRect.height,
    renderedWidth: imgRect.width,
    renderedHeight: imgRect.height,
    offsetX: imgRect.left - viewportRect.left,
    offsetY: imgRect.top - viewportRect.top,
  };
}

/**
 * Transform bubble coordinates from original image space to rendered screen space
 * (Same logic as bubble-debug.js)
 */
function transformBubbleCoordinates(bbox, imageSize, renderInfo) {
  // Calculate the scale factor (how much the image is scaled)
  const scaleX = renderInfo.renderedWidth / imageSize.width;
  const scaleY = renderInfo.renderedHeight / imageSize.height;

  // Use the smaller scale to maintain aspect ratio (object-fit: contain behavior)
  const scale = Math.min(scaleX, scaleY);

  // Transform coordinates
  const x1 = bbox.x1 * scale + renderInfo.offsetX;
  const y1 = bbox.y1 * scale + renderInfo.offsetY;
  const x2 = bbox.x2 * scale + renderInfo.offsetX;
  const y2 = bbox.y2 * scale + renderInfo.offsetY;

  return {
    left: x1,
    top: y1,
    width: x2 - x1,
    height: y2 - y1,
  };
}

/**
 * Create a clickable translation bubble overlay element
 */
function createTranslationBubble(translation, imageSize, renderInfo) {
  const coords = transformBubbleCoordinates(translation.bbox, imageSize, renderInfo);

  const bubble = document.createElement("div");
  bubble.className = "translation-bubble";

  // Position and size
  bubble.style.position = "absolute";
  bubble.style.left = `${coords.left}px`;
  bubble.style.top = `${coords.top}px`;
  bubble.style.width = `${coords.width}px`;
  bubble.style.height = `${coords.height}px`;
  bubble.style.cursor = "pointer";
  bubble.style.border = "2px solid rgba(74, 144, 226, 0.5)";
  bubble.style.background = "rgba(74, 144, 226, 0.1)";
  bubble.style.borderRadius = "4px";
  bubble.style.transition = "all 0.2s ease";
  bubble.style.zIndex = "10";

  // Store translation data on the element
  bubble.dataset.translation = JSON.stringify(translation);

  // Add hover effect
  bubble.addEventListener("mouseenter", () => {
    bubble.style.background = "rgba(74, 144, 226, 0.2)";
    bubble.style.border = "2px solid rgba(74, 144, 226, 0.8)";
  });

  bubble.addEventListener("mouseleave", () => {
    bubble.style.background = "rgba(74, 144, 226, 0.1)";
    bubble.style.border = "2px solid rgba(74, 144, 226, 0.5)";
  });

  // Add click handler
  bubble.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent event from bubbling
    handleBubbleClick(translation, bubble);
  });

  return bubble;
}

/**
 * Handle click on a translation bubble
 */
function handleBubbleClick(translation, bubbleElement) {
  if (!translationOverlayManager) {
    console.error("Translation overlay manager not initialized");
    return;
  }

  // Get the bubble's current screen position
  const bubbleBounds = bubbleElement.getBoundingClientRect();

  // Show the translation overlay
  translationOverlayManager.show(translation, bubbleBounds);
}

/**
 * Render all translation bubble overlays
 */
function renderTranslationBubbles() {
  const overlay = document.getElementById("translationBubblesOverlay");
  if (!overlay) {
    console.warn("Translation bubbles overlay element not found");
    return;
  }

  // Clear existing translation bubbles
  translationBubbleElements.forEach(el => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });
  translationBubbleElements = [];

  // Get translation data and image info
  const translations = window.COMIC_PAGE_DATA?.translations || [];
  const imageSize = window.COMIC_PAGE_DATA?.dimensions;

  if (!imageSize || translations.length === 0) {
    // No translations available for this page
    return;
  }

  // Get current render info
  const renderInfo = getImageRenderInfo();
  if (!renderInfo) {
    return;
  }

  // Create translation bubble elements
  for (const translation of translations) {
    const bubbleElement = createTranslationBubble(translation, imageSize, renderInfo);
    overlay.appendChild(bubbleElement);
    translationBubbleElements.push(bubbleElement);
  }

  console.log(`Rendered ${translations.length} translation bubbles`);
}

/**
 * Handle window resize - recalculate bubble positions
 */
function handleResize() {
  renderTranslationBubbles();
}

/**
 * Get reference to the panel navigator for zoom integration
 */
function getPanelNavigator() {
  // Wait for window.panelNavigator to be available
  // panel-navigator.js creates this global object
  if (window.panelNavigator) {
    return window.panelNavigator;
  }

  // Fallback stub if panel-navigator hasn't initialized yet
  console.warn("Panel navigator not yet initialized, using fallback");
  return {
    onNavigate: () => { }, // No-op fallback
  };
}

/**
 * Initialize translation bubbles system
 */
function initialize() {
  // Get panel navigator instance
  const navigator = getPanelNavigator();

  // Initialize translation overlay manager
  translationOverlayManager = new TranslationOverlayManager(navigator);

  // Wait for image to load before rendering bubbles
  const img = document.querySelector(".viewport img");
  if (img) {
    if (img.complete) {
      // Image already loaded
      renderTranslationBubbles();
    } else {
      // Wait for image to load
      img.addEventListener('load', () => {
        renderTranslationBubbles();
      });
    }
  }

  // Re-render bubbles when panel navigation occurs (zoom changes)
  if (navigator && navigator.onNavigate) {
    navigator.onNavigate(() => {
      // Use a small timeout to let the CSS transform complete
      setTimeout(() => {
        renderTranslationBubbles();
      }, 500);
    });
  }

  // Handle window resize
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResize, 150);
  });

  console.log("Translation bubbles initialized");
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
