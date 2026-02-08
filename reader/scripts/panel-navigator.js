import { getSpacing } from "./spacing-utils.js";
import { saveProgress } from "./reading-progress.js";

class PanelNavigator {
  constructor() {
    this.currentPage = 1;
    this.currentPanel = null;
    this.totalPages = 1;
    this.panels = [];
    this.imageSize = { width: 0, height: 0 };
    this.navigationCallbacks = [];
  }

  getImage() {
    return document.querySelector(".viewport img");
  }

  calculateZoomTransform(panel, imageSize, viewportSize) {
    const padding = getSpacing(3);

    const img = this.getImage();
    const renderedWidth = img.clientWidth;
    const renderedHeight = img.clientHeight;

    // Calculate the current CSS scale applied to the image
    const currentScale = Math.min(
      renderedWidth / imageSize.width,
      renderedHeight / imageSize.height,
    );

    // Convert panel coordinates to rendered (CSS) pixels
    const renderedPanel = {
      x: panel.x * currentScale,
      y: panel.y * currentScale,
      width: panel.width * currentScale,
      height: panel.height * currentScale,
    };

    // Calculate scale needed to fit panel in viewport with padding
    const targetScaleX =
      (viewportSize.width - padding * 2) / renderedPanel.width;
    const targetScaleY =
      (viewportSize.height - padding * 2) / renderedPanel.height;
    const scale = Math.min(targetScaleX, targetScaleY);

    // Calculate image offset (centered)
    const imageOffsetX = (viewportSize.width - renderedWidth) / 2;
    const imageOffsetY = (viewportSize.height - renderedHeight) / 2;

    // Calculate panel and viewport centers
    const panelCenterX = renderedPanel.x + renderedPanel.width / 2;
    const panelCenterY = renderedPanel.y + renderedPanel.height / 2;
    const viewportCenterX = viewportSize.width / 2;
    const viewportCenterY = viewportSize.height / 2;

    // Calculate target position to center panel
    const targetX = viewportCenterX - imageOffsetX;
    const targetY = viewportCenterY - imageOffsetY;

    // Calculate translation needed
    const translateX = targetX - panelCenterX * scale;
    const translateY = targetY - panelCenterY * scale;

    return { scale, translateX, translateY };
  }

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

  zoomToFullPage() {
    const img = this.getImage();
    img.style.translate = "0px 0px";
    img.style.scale = "1";
  }

  triggerNavigationCallbacks() {
    const img = this.getImage();
    // Wait for the transition to finish before calling callbacks
    const onTransitionEnd = (e) => {
      // Only respond to translate or scale transitions on the image element
      if (
        e.target === img &&
        (e.propertyName === "translate" || e.propertyName === "scale")
      ) {
        img.removeEventListener("transitionend", onTransitionEnd);
        this.executeCallbacks();
      }
    };

    img.addEventListener("transitionend", onTransitionEnd);
  }

  executeCallbacks() {
    for (const callback of this.navigationCallbacks) {
      callback();
    }
  }

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

  goToNextPage() {
    if (this.currentPage < this.totalPages) {
      this.navigateToPage(this.currentPage + 1);
    }
  }

  goToPreviousPage() {
    if (this.currentPage > 1) {
      this.navigateToPage(this.currentPage - 1);
    }
  }

  canGoBack() {
    return !(this.currentPage === 1 && this.currentPanel === null);
  }

  updateNavigationUI() {
    const navMenu = document.querySelector("comic-nav-menu");
    if (!navMenu) return;

    navMenu.setAttribute("current-page", this.currentPage.toString());
    navMenu.setAttribute("total-pages", this.totalPages.toString());
    navMenu.setAttribute("can-go-back", this.canGoBack().toString());

    const isLastPosition =
      this.currentPage === this.totalPages &&
      (this.panels.length === 0 ||
        this.currentPanel === this.panels.length - 1);
    navMenu.setNextButtonDisabled(isLastPosition);
  }

  attachEventHandlers() {
    // Listen for custom events from comic-nav-menu component
    document.addEventListener("nav-next", () => this.goNext());
    document.addEventListener("nav-back", () => this.goBack());
    document.addEventListener("nav-prev-page", () => this.goToPreviousPage());
    document.addEventListener("nav-next-page", () => this.goToNextPage());
    document.addEventListener("nav-go-to-page", (e) => {
      const targetPage = e.detail?.page;
      this.navigateToPage(targetPage);
    });
    document.addEventListener("nav-home", () => {
      window.location.href = "../index.html";
    });

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

  initialize() {
    // Get page metadata from embedded data
    this.currentPage = window.COMIC_PAGE_DATA.pageNum;
    this.totalPages = window.COMIC_PAGE_DATA.totalPages;

    // Track reading progress
    saveProgress(window.COMIC_PAGE_DATA.album, window.COMIC_PAGE_DATA.pageNum);

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

const panelNavigator = new PanelNavigator();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () =>
    panelNavigator.initialize(),
  );
} else {
  panelNavigator.initialize();
}

export default panelNavigator;
