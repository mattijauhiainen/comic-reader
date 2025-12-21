/**
 * ComicNavMenu - Web component for comic reader navigation
 * Provides expandable menu with navigation controls
 */
class ComicNavMenu extends HTMLElement {
  constructor() {
    super();
    this._isMenuExpanded = false;
  }

  static get observedAttributes() {
    return ["current-page", "total-pages", "can-go-back"];
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
    this.restoreMenuState();
    this.setupPageSwapListener();
  }

  get currentPage() {
    return Number.parseInt(this.getAttribute("current-page") || "1", 10);
  }

  get totalPages() {
    return Number.parseInt(this.getAttribute("total-pages") || "1", 10);
  }

  get canGoBack() {
    return this.getAttribute("can-go-back") === "true";
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.updateNavigationUI();
    }
  }

  render() {
    this.innerHTML = `
      <style>
        comic-nav-menu {
          display: contents;
        }

        comic-nav-menu .nav-buttons {
          position: fixed;
          bottom: calc(var(--spacing-2) + env(safe-area-inset-bottom, 0px));
          right: var(--spacing-2);
          display: flex;
          align-items: flex-end;
          gap: var(--spacing-1);
          z-index: 100;
        }

        /* Prevent transitions on the menu during page transitions */
        comic-nav-menu .nav-buttons {
          view-transition-name: no-transition;
        }

        comic-nav-menu .nav-btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--color-surface-overlay);
          border: none;
          box-shadow: 0 2px 8px var(--color-shadow);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, transform 0.2s;
          color: var(--color-text-body);
          font-size: var(--font-xl);
        }

        comic-nav-menu .nav-btn:hover:not(.disabled) {
          background: var(--color-surface-base);
          transform: scale(1.05);
        }

        comic-nav-menu .nav-btn:active:not(.disabled) {
          transform: scale(0.95);
        }

        comic-nav-menu .nav-btn.disabled {
          color: var(--color-text-disabled);
          pointer-events: none;
          opacity: 0.5;
        }

        comic-nav-menu .nav-btn-icon {
          display: block;
          line-height: 1;
        }

        /* Expanded navigation menu */
        comic-nav-menu .expanded-nav-menu {
          position: absolute;
          bottom: 64px;
          right: 64px;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-1);
          opacity: 0;
          pointer-events: none;
          transform: translateY(20px);
          transition: opacity 0.3s, transform 0.3s;
        }

        comic-nav-menu .expanded-nav-menu.active {
          opacity: 1;
          pointer-events: all;
          transform: translateY(0);
        }

        /* Navigation menu item with label */
        comic-nav-menu .nav-menu-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-1);
          justify-content: flex-end;
        }

        comic-nav-menu .nav-menu-label {
          background: transparent;
          padding: var(--spacing-0-5) var(--spacing-2);
          border-radius: var(--radius);
          color: var(--color-text-body);
          font-size: var(--font-sm);
          white-space: nowrap;
          font-weight: 500;
          text-align: right;
        }
      </style>

      <!-- SVG icon definitions -->
      <svg hidden>
        <symbol id="icon-hamburger" viewBox="0 0 24 24">
          <text x="12" y="18" text-anchor="middle" font-size="20">☰</text>
        </symbol>
        <symbol id="icon-back-arrow" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="4"/>
        </symbol>
        <symbol id="icon-home" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" stroke-width="4"/>
        </symbol>
        <symbol id="icon-prev-page" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" stroke-width="4"/>
        </symbol>
        <symbol id="icon-next-page" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="4"/>
        </symbol>
        <symbol id="icon-next" viewBox="0 0 24 24" fill="none">
          <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="4"/>
        </symbol>
      </svg>

      <nav class="nav-buttons">
        <button id="expandableNavBtn" class="nav-btn" aria-label="Navigation menu">
          <span class="nav-btn-icon"><svg width="24" height="24"><use href="#icon-hamburger"/></svg></span>
        </button>
        <div id="expandedNavMenu" class="expanded-nav-menu">
          <div class="nav-menu-item">
            <span class="nav-menu-label">Back to Albums</span>
            <button id="backToIndexBtn" class="nav-btn" aria-label="Back to Albums">
              <span class="nav-btn-icon"><svg width="24" height="24"><use href="#icon-home"/></svg></span>
            </button>
          </div>
          <div class="nav-menu-item">
            <span class="nav-menu-label">Previous page</span>
            <button id="prevPageBtn" class="nav-btn" aria-label="Previous page">
              <span class="nav-btn-icon"><svg width="24" height="24"><use href="#icon-prev-page"/></svg></span>
            </button>
          </div>
          <div class="nav-menu-item">
            <span class="nav-menu-label">Next page</span>
            <button id="nextPageBtn" class="nav-btn" aria-label="Next page">
              <span class="nav-btn-icon"><svg width="24" height="24"><use href="#icon-next-page"/></svg></span>
            </button>
          </div>
        </div>
        <button id="nextBtn" class="nav-btn" aria-label="Next">
          <span class="nav-btn-icon"><svg width="24" height="24"><use href="#icon-next"/></svg></span>
        </button>
      </nav>
    `;
  }

  attachEventListeners() {
    const expandableBtn = this.querySelector("#expandableNavBtn");
    const nextBtn = this.querySelector("#nextBtn");
    const backToIndexBtn = this.querySelector("#backToIndexBtn");
    const prevPageBtn = this.querySelector("#prevPageBtn");
    const nextPageBtn = this.querySelector("#nextPageBtn");

    // Expandable button - toggle menu or trigger back navigation
    expandableBtn.addEventListener("click", () => {
      if (this._isMenuExpanded) {
        // Menu is open, button shows back arrow - execute back action if available
        if (this.canGoBack) {
          this.dispatchEvent(
            new CustomEvent("nav-back", { bubbles: true, composed: true }),
          );
        }
        // Keep the menu open
      } else {
        // Menu is closed, button shows burger - open the menu
        this.openMenu();
      }
    });

    // Next button
    nextBtn.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("nav-next", { bubbles: true, composed: true }),
      );
    });

    // Back to index button
    backToIndexBtn.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("nav-home", { bubbles: true, composed: true }),
      );
    });

    // Page navigation buttons
    prevPageBtn.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("nav-prev-page", { bubbles: true, composed: true }),
      );
    });

    nextPageBtn.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("nav-next-page", { bubbles: true, composed: true }),
      );
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (this._isMenuExpanded && !e.composedPath().includes(this)) {
        this.closeMenu();
      }
    });
  }

  setupPageSwapListener() {
    // Save menu state before navigating away
    window.addEventListener("pageswap", () => {
      sessionStorage.setItem("menuExpanded", this._isMenuExpanded.toString());
    });
  }

  restoreMenuState() {
    // Restore menu state BEFORE view transition animates
    const menuExpanded = sessionStorage.getItem("menuExpanded") === "true";
    sessionStorage.removeItem("menuExpanded");

    if (menuExpanded) {
      const menu = this.querySelector("#expandedNavMenu");
      const btnIcon = this.querySelector("#expandableNavBtn .nav-btn-icon");

      if (menu && btnIcon) {
        // Disable transition temporarily to prevent animation on restore
        const originalTransition = menu.style.transition;
        menu.style.transition = "none";
        menu.classList.add("active");
        this._isMenuExpanded = true;

        // Update icon to back arrow
        btnIcon.querySelector("use").setAttribute("href", "#icon-back-arrow");

        requestAnimationFrame(() => {
          menu.style.transition = originalTransition;
        });
      }
    }
  }

  openMenu() {
    const menu = this.querySelector("#expandedNavMenu");
    const btnIcon = this.querySelector("#expandableNavBtn .nav-btn-icon");

    menu.classList.add("active");
    this._isMenuExpanded = true;

    // Change icon to back arrow
    btnIcon.querySelector("use").setAttribute("href", "#icon-back-arrow");
  }

  closeMenu() {
    const menu = this.querySelector("#expandedNavMenu");
    const btnIcon = this.querySelector("#expandableNavBtn .nav-btn-icon");

    menu.classList.remove("active");
    this._isMenuExpanded = false;

    // Change icon to hamburger
    btnIcon.querySelector("use").setAttribute("href", "#icon-hamburger");
  }

  updateNavigationUI() {
    const prevPageBtn = this.querySelector("#prevPageBtn");
    const nextPageBtn = this.querySelector("#nextPageBtn");

    if (!prevPageBtn || !nextPageBtn) return;

    // Update button states based on attributes
    prevPageBtn.classList.toggle("disabled", this.currentPage === 1);
    nextPageBtn.classList.toggle(
      "disabled",
      this.currentPage === this.totalPages,
    );
  }

  /**
   * Public API: Set the disabled state of the next button
   * Called by panel-navigator to control the next button based on panel state
   */
  setNextButtonDisabled(disabled) {
    const nextBtn = this.querySelector("#nextBtn");
    if (nextBtn) {
      nextBtn.classList.toggle("disabled", disabled);
    }
  }
}

// Register the custom element
customElements.define("comic-nav-menu", ComicNavMenu);

export default ComicNavMenu;
