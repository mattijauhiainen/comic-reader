// Bubble debug visualization overlay
// Press 'B' to toggle bubble visualization

let bubbleOverlayVisible = false;
let bubbleElements = [];

/**
 * Calculate the rendered image dimensions and position
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
 * Transform bubble coordinates from original image space to rendered space
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
 * Create a bubble box element
 */
function createBubbleElement(bubble, imageSize, renderInfo) {
  const coords = transformBubbleCoordinates(bubble.bbox, imageSize, renderInfo);

  const bubbleBox = document.createElement("div");
  bubbleBox.className = "bubble-box";

  // Add type-specific class
  if (bubble.label_id === 1) {
    bubbleBox.classList.add("text-bubble");
  } else if (bubble.label_id === 2) {
    bubbleBox.classList.add("text-free");
  }

  // Position and size
  bubbleBox.style.left = `${coords.left}px`;
  bubbleBox.style.top = `${coords.top}px`;
  bubbleBox.style.width = `${coords.width}px`;
  bubbleBox.style.height = `${coords.height}px`;

  // Create confidence label
  const label = document.createElement("div");
  label.className = "confidence-label";
  label.textContent = `${bubble.label}: ${bubble.confidence.toFixed(2)}`;
  bubbleBox.appendChild(label);

  return bubbleBox;
}

/**
 * Render all bubble overlays
 */
function renderBubbles() {
  const overlay = document.getElementById("bubbleOverlay");
  if (!overlay) {
    console.warn("Bubble overlay element not found");
    return;
  }

  // Clear existing bubbles
  overlay.innerHTML = "";
  bubbleElements = [];

  // Get bubble data and image info
  const bubbles = window.COMIC_PAGE_DATA?.bubbles || [];
  const imageSize = window.COMIC_PAGE_DATA?.dimensions;

  if (!imageSize || bubbles.length === 0) {
    return;
  }

  // Get current render info
  const renderInfo = getImageRenderInfo();
  if (!renderInfo) {
    return;
  }

  // Create bubble elements
  for (const bubble of bubbles) {
    const bubbleElement = createBubbleElement(bubble, imageSize, renderInfo);
    overlay.appendChild(bubbleElement);
    bubbleElements.push(bubbleElement);
  }
}

/**
 * Toggle bubble overlay visibility
 */
function toggleBubbleOverlay() {
  bubbleOverlayVisible = !bubbleOverlayVisible;
  const overlay = document.getElementById("bubbleOverlay");

  if (!overlay) {
    return;
  }

  if (bubbleOverlayVisible) {
    overlay.classList.add("visible");
    renderBubbles();
    console.log("Bubble overlay enabled (press B to hide)");
  } else {
    overlay.classList.remove("visible");
    console.log("Bubble overlay disabled (press B to show)");
  }
}

/**
 * Handle window resize - recalculate bubble positions
 */
function handleResize() {
  if (bubbleOverlayVisible) {
    renderBubbles();
  }
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyPress(event) {
  // Toggle with 'B' key
  if (event.key === "b" || event.key === "B") {
    toggleBubbleOverlay();
  }
}

/**
 * Initialize bubble debug overlay
 */
function initialize() {
  // Attach keyboard event listener
  document.addEventListener("keydown", handleKeyPress);

  // Handle window resize
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResize, 150);
  });

  console.log("Bubble debug initialized. Press 'B' to toggle bubble overlay.");
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
