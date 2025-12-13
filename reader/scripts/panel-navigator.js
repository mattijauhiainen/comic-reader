// Panel-level navigation with zoom
// Manages state and transitions between full page view and individual panels

// Navigation state
let currentPage = 1;
let currentPanel = null; // null = full page view, number = panel ID
let totalPages = 1;
let panels = [];
let imageSize = { width: 0, height: 0 };

/**
 * Load panel data from JSON file
 */
async function loadPanelData(pageNum) {
  const panelDataPath = window.COMIC_PAGE_DATA.panelDataPath;
  try {
    const response = await fetch(panelDataPath);
    if (!response.ok) {
      console.warn(`Failed to load panel data for page ${pageNum}`);
      return [];
    }
    const data = await response.json();
    imageSize = data.dimensions;
    return data.panels || [];
  } catch (error) {
    console.error("Error loading panel data:", error);
    return [];
  }
}

/**
 * Calculate transform values to zoom to a panel
 */
function calculateZoomTransform(panel, imageSize, viewportSize) {
  const padding = 20; // px padding around panel

  // Get the actual rendered size of the image (after CSS object-fit: contain)
  const img = document.querySelector(".viewport img");
  const renderedWidth = img.clientWidth;
  const renderedHeight = img.clientHeight;

  // Calculate the current CSS scale (how much the image is already scaled)
  const currentScale = Math.min(
    renderedWidth / imageSize.width,
    renderedHeight / imageSize.height,
  );

  // Panel coordinates are in original image space, convert to rendered space
  const renderedPanel = {
    x: panel.x * currentScale,
    y: panel.y * currentScale,
    width: panel.width * currentScale,
    height: panel.height * currentScale,
  };

  // Calculate scale needed to fit the rendered panel in viewport
  const targetScaleX = (viewportSize.width - padding * 2) / renderedPanel.width;
  const targetScaleY =
    (viewportSize.height - padding * 2) / renderedPanel.height;
  const scale = Math.min(targetScaleX, targetScaleY);

  // Calculate the image element's offset within the viewport (due to flexbox centering)
  const imageOffsetX = (viewportSize.width - renderedWidth) / 2;
  const imageOffsetY = (viewportSize.height - renderedHeight) / 2;

  // Calculate translation to center the panel in viewport
  // The transform works in image-relative coordinates, so we need to account for the image offset
  const panelCenterX = renderedPanel.x + renderedPanel.width / 2;
  const panelCenterY = renderedPanel.y + renderedPanel.height / 2;
  const viewportCenterX = viewportSize.width / 2;
  const viewportCenterY = viewportSize.height / 2;

  // Target position in image-relative coordinates
  const targetX = viewportCenterX - imageOffsetX;
  const targetY = viewportCenterY - imageOffsetY;

  const translateX = targetX - panelCenterX * scale;
  const translateY = targetY - panelCenterY * scale;

  return { scale, translateX, translateY };
}

/**
 * Zoom viewport to show a specific panel
 */
function zoomToPanel(panelId) {
  const panel = panels[panelId];
  const { scale, translateX, translateY } = calculateZoomTransform(
    panel,
    imageSize,
    { width: window.innerWidth, height: window.innerHeight },
  );

  const img = document.querySelector(".viewport img");
  // Use modern CSS translate and scale properties
  img.style.translate = `${translateX}px ${translateY}px`;
  img.style.scale = scale;
}

/**
 * Reset zoom to show full page
 */
function zoomToFullPage() {
  const img = document.querySelector(".viewport img");
  // Reset to default translate and scale
  img.style.translate = "0px 0px";
  img.style.scale = "1";
}

/**
 * Navigate to next panel or page
 */
function goNext() {
  if (currentPanel === null) {
    // Currently viewing full page → zoom to first panel
    if (panels.length > 0) {
      currentPanel = 0;
      zoomToPanel(currentPanel);
      updateNavigationUI();
    } else {
      // No panels detected, go to next page
      navigateToPage(currentPage + 1);
    }
  } else if (currentPanel < panels.length - 1) {
    // More panels on this page → zoom to next panel
    currentPanel++;
    zoomToPanel(currentPanel);
    updateNavigationUI();
  } else {
    // Last panel → go to next page
    if (currentPage < totalPages) {
      navigateToPage(currentPage + 1);
    }
  }
}

/**
 * Navigate to previous panel or page
 */
function goBack() {
  if (currentPanel === null) {
    // Currently viewing full page → go to previous page (full view)
    if (currentPage > 1) {
      window.location.href = `page${currentPage - 1}.html`;
    }
  } else if (currentPanel > 0) {
    // Not first panel → go to previous panel
    currentPanel--;
    zoomToPanel(currentPanel);
    updateNavigationUI();
  } else {
    // First panel → return to full page view
    currentPanel = null;
    zoomToFullPage();
    updateNavigationUI();
  }
}

/**
 * Navigate to a different page
 */
function navigateToPage(pageNum) {
  // Simple page navigation - new page always loads in full view
  window.location.href = `page${pageNum}.html`;
}

/**
 * Update navigation UI (button states, position indicator)
 */
function updateNavigationUI() {
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const indicator = document.getElementById("positionIndicator");

  // Update indicator text - always show page number only
  indicator.textContent = `${currentPage} / ${totalPages}`;

  // Update button states
  const isFirstPosition = currentPage === 1 && currentPanel === null;
  const isLastPosition =
    currentPage === totalPages &&
    (panels.length === 0 || currentPanel === panels.length - 1);

  prevBtn.classList.toggle("disabled", isFirstPosition);
  nextBtn.classList.toggle("disabled", isLastPosition);

  // Prevent default link behavior
  prevBtn.href = "javascript:void(0)";
  nextBtn.href = "javascript:void(0)";
}

/**
 * Attach event handlers for navigation
 */
function attachEventHandlers() {
  // Click handlers for navigation buttons
  document.getElementById("nextBtn").addEventListener("click", goNext);
  document.getElementById("prevBtn").addEventListener("click", goBack);

  // Handle window resize - recalculate zoom
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (currentPanel !== null) {
        zoomToPanel(currentPanel);
      }
    }, 150);
  });
}

/**
 * Initialize the panel navigator
 */
async function initialize() {
  // Get page metadata from embedded data
  currentPage = window.COMIC_PAGE_DATA.pageNum;
  totalPages = window.COMIC_PAGE_DATA.totalPages;

  // Load panel data
  panels = await loadPanelData(currentPage);

  // Always start in full page view
  currentPanel = null;
  zoomToFullPage();

  updateNavigationUI();
  attachEventHandlers();
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
