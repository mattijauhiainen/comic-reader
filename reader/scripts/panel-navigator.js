import { getSpacing } from "./spacing-utils.js";

/**
 * PanelNavigator class - manages comic page navigation and panel zooming
 */
class PanelNavigator {
  constructor() {
    // Navigation state
    this.currentPage = 1;
    this.currentPanel = null; // null = full page view, number = panel ID
    this.totalPages = 1;
    this.panels = [];
    this.imageSize = { width: 0, height: 0 };
    this.navigationCallbacks = [];
  }

  getImage() {
    return document.querySelector(".viewport img");
  }

  /**
   * Calculate transform values to zoom to a panel
   */
  calculateZoomTransform(panel, imageSize, viewportSize) {
    const padding = getSpacing(3); // --spacing-3 (24px) padding around panel

    // Get the actual rendered size of the image (after CSS object-fit: contain)
    const img = this.getImage();
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
    const targetScaleX =
      (viewportSize.width - padding * 2) / renderedPanel.width;
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
  zoomToPanel(panelId) {
    const panel = this.panels[panelId];
    const { scale, translateX, translateY } = this.calculateZoomTransform(
      panel,
      this.imageSize,
      { width: window.innerWidth, height: window.innerHeight },
    );

    const img = this.getImage();
    img.style.translate = `${translateX}px ${translateY}px`;
    img.style.scale = scale;
  }

  /**
   * Reset zoom to show full page
   */
  zoomToFullPage() {
    const img = this.getImage();
    img.style.translate = "0px 0px";
    img.style.scale = "1";
  }

  /**
   * Trigger navigation callbacks after zoom animation completes
   */
  triggerNavigationCallbacks() {
    const img = this.getImage();
    const onTransitionEnd = (e) => {
      // Only respond to translate or scale transitions on the image element
      if (
        e.target === img &&
        (e.propertyName === "translate" || e.propertyName === "scale")
      ) {
        // Remove listener to avoid firing multiple times
        img.removeEventListener("transitionend", onTransitionEnd);
        this.executeCallbacks();
      }
    };

    img.addEventListener("transitionend", onTransitionEnd);
  }

  /**
   * Execute all registered callbacks
   */
  executeCallbacks() {
    for (const callback of this.navigationCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error("Navigation callback error:", error);
      }
    }
  }

  /**
   * Navigate to next panel or page
   */
  goNext() {
    this.triggerNavigationCallbacks();

    if (this.currentPanel === null) {
      // Currently viewing full page → zoom to first panel
      if (this.panels.length > 0) {
        this.currentPanel = 0;
        this.zoomToPanel(this.currentPanel);
        this.updateNavigationUI();
      } else {
        // No panels detected, go to next page
        this.navigateToPage(this.currentPage + 1);
      }
    } else if (this.currentPanel < this.panels.length - 1) {
      // More panels on this page → zoom to next panel
      this.currentPanel++;
      this.zoomToPanel(this.currentPanel);
      this.updateNavigationUI();
    } else {
      // Last panel → go to next page
      if (this.currentPage < this.totalPages) {
        this.navigateToPage(this.currentPage + 1);
      }
    }
  }

  /**
   * Navigate to previous panel or page
   */
  goBack() {
    this.triggerNavigationCallbacks();

    if (this.currentPanel === null) {
      // Currently viewing full page → go to previous page (full view)
      if (this.currentPage > 1) {
        window.location.href = `page${this.currentPage - 1}.html`;
      }
    } else if (this.currentPanel > 0) {
      // Not first panel → go to previous panel
      this.currentPanel--;
      this.zoomToPanel(this.currentPanel);
      this.updateNavigationUI();
    } else {
      // First panel → return to full page view
      this.currentPanel = null;
      this.zoomToFullPage();
      this.updateNavigationUI();
    }
  }

  navigateToPage(pageNum) {
    window.location.href = `page${pageNum}.html`;
  }

  /**
   * Navigate to next page (skipping panels)
   */
  goToNextPage() {
    if (this.currentPage < this.totalPages) {
      this.navigateToPage(this.currentPage + 1);
    }
  }

  /**
   * Navigate to previous page (skipping panels)
   */
  goToPreviousPage() {
    if (this.currentPage > 1) {
      this.navigateToPage(this.currentPage - 1);
    }
  }

  /**
   * Check if back action is available
   */
  canGoBack() {
    return !(this.currentPage === 1 && this.currentPanel === null);
  }

  /**
   * Update navigation UI (button states)
   */
  updateNavigationUI() {
    const navMenu = document.querySelector("comic-nav-menu");
    if (!navMenu) return;

    // Update component attributes
    navMenu.setAttribute("current-page", this.currentPage.toString());
    navMenu.setAttribute("total-pages", this.totalPages.toString());
    navMenu.setAttribute("can-go-back", this.canGoBack().toString());

    // Update next button state based on panel position using public API
    const isLastPosition =
      this.currentPage === this.totalPages &&
      (this.panels.length === 0 ||
        this.currentPanel === this.panels.length - 1);
    navMenu.setNextButtonDisabled(isLastPosition);
  }

  /**
   * Attach event handlers for navigation
   */
  attachEventHandlers() {
    // Listen for custom events from comic-nav-menu component
    document.addEventListener("nav-next", () => this.goNext());
    document.addEventListener("nav-back", () => this.goBack());
    document.addEventListener("nav-prev-page", () => this.goToPreviousPage());
    document.addEventListener("nav-next-page", () => this.goToNextPage());
    document.addEventListener("nav-home", () => {
      window.location.href = "../index.html";
    });

    // Handle window resize - recalculate zoom
    let resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (this.currentPanel !== null) {
          this.zoomToPanel(this.currentPanel);
        }
      }, 150);
    });
  }

  /**
   * Initialize the panel navigator
   */
  initialize() {
    // Get page metadata from embedded data
    this.currentPage = window.COMIC_PAGE_DATA.pageNum;
    this.totalPages = window.COMIC_PAGE_DATA.totalPages;

    // Load panel data from embedded data
    this.panels = window.COMIC_PAGE_DATA.panels || [];
    this.imageSize = window.COMIC_PAGE_DATA.dimensions || {
      width: 0,
      height: 0,
    };

    // Always start in full page view
    this.currentPanel = null;
    this.zoomToFullPage();

    this.updateNavigationUI();
    this.attachEventHandlers();
  }

  /**
   * Register a callback to be called when navigation occurs
   * @param {Function} callback - Function to call on navigation
   */
  onNavigate(callback) {
    this.navigationCallbacks.push(callback);
  }
}

// Create and export singleton instance
const panelNavigator = new PanelNavigator();

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () =>
    panelNavigator.initialize(),
  );
} else {
  panelNavigator.initialize();
}

export default panelNavigator;
