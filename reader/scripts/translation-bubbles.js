/**
 * Translation Bubbles
 * Renders clickable overlays for translations and manages interaction
 */

import { TranslationOverlayManager } from "./translation-overlay.js";
import panelNavigator from "./panel-navigator.js";

class TranslationBubblesManager {
  constructor() {
    this.translationOverlayManager = null;
    this.translationBubbleElements = [];
  }

  /**
   * Calculate the rendered image dimensions and position
   */
  getImageRenderInfo() {
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
   */
  transformBubbleCoordinates(bbox, imageSize, renderInfo) {
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
  createTranslationBubble(translation, imageSize, renderInfo) {
    const coords = this.transformBubbleCoordinates(
      translation.bbox,
      imageSize,
      renderInfo,
    );

    const bubble = document.createElement("div");
    bubble.className = "translation-bubble";

    // Position and size
    bubble.style.position = "absolute";
    bubble.style.left = `${coords.left}px`;
    bubble.style.top = `${coords.top}px`;
    bubble.style.width = `${coords.width}px`;
    bubble.style.height = `${coords.height}px`;
    bubble.style.cursor = "pointer";

    // Store translation data on the element
    bubble.dataset.translation = JSON.stringify(translation);

    // Add click handler
    bubble.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent event from bubbling
      this.handleBubbleClick(translation, bubble);
    });

    return bubble;
  }

  /**
   * Handle click on a translation bubble
   */
  handleBubbleClick(translation, bubbleElement) {
    if (!this.translationOverlayManager) {
      console.error("Translation overlay manager not initialized");
      return;
    }

    // Get the bubble's current screen position
    const bubbleBounds = bubbleElement.getBoundingClientRect();

    // Show the translation overlay
    this.translationOverlayManager.show(translation, bubbleBounds);
  }

  /**
   * Render all translation bubble overlays
   */
  renderTranslationBubbles() {
    const overlay = document.getElementById("translationBubblesOverlay");
    if (!overlay) {
      console.warn("Translation bubbles overlay element not found");
      return;
    }

    // Clear existing translation bubbles
    for (const el of this.translationBubbleElements) {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }
    this.translationBubbleElements = [];

    // Get translation data and image info
    const translations = window.COMIC_PAGE_DATA?.translations || [];
    const imageSize = window.COMIC_PAGE_DATA?.dimensions;

    if (!imageSize || translations.length === 0) {
      // No translations available for this page
      return;
    }

    // Get current render info
    const renderInfo = this.getImageRenderInfo();
    if (!renderInfo) {
      return;
    }

    // Create translation bubble elements
    for (const translation of translations) {
      const bubbleElement = this.createTranslationBubble(
        translation,
        imageSize,
        renderInfo,
      );
      overlay.appendChild(bubbleElement);
      this.translationBubbleElements.push(bubbleElement);
    }

    console.log(`Rendered ${translations.length} translation bubbles`);
  }

  /**
   * Handle window resize - recalculate bubble positions
   */
  handleResize() {
    this.renderTranslationBubbles();
  }

  /**
   * Initialize translation bubbles system
   */
  initialize() {
    this.translationOverlayManager = new TranslationOverlayManager(
      panelNavigator,
    );

    // Wait for image to load before rendering bubbles
    const img = document.querySelector(".viewport img");
    if (img) {
      if (img.complete) {
        // Image already loaded
        this.renderTranslationBubbles();
      } else {
        // Wait for image to load
        img.addEventListener("load", () => {
          this.renderTranslationBubbles();
        });
      }
    }

    // Re-render bubbles when panel navigation occurs (zoom changes)
    // Callbacks are fired after the transition completes
    panelNavigator.onNavigate(() => {
      this.renderTranslationBubbles();
    });

    // Handle window resize
    let resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => this.handleResize(), 150);
    });

    console.log("Translation bubbles initialized");
  }
}

// Create and export singleton instance
const translationBubblesManager = new TranslationBubblesManager();

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () =>
    translationBubblesManager.initialize(),
  );
} else {
  translationBubblesManager.initialize();
}

export default translationBubblesManager;
