// Manages navigation state across page transitions
// Detects navigation direction and transition type for view transitions

// Store the current page number before navigating away
window.addEventListener("pageswap", (event) => {
  if (event.viewTransition) {
    const currentPage = window.COMIC_PAGE_DATA?.pageNum ?? null;
    sessionStorage.setItem("previousPage", currentPage?.toString() ?? "null");
  }
});

// Check navigation direction when the new page loads
window.addEventListener("pagereveal", (event) => {
  // Only process if a view transition is happening
  if (!event.viewTransition) return;

  const currentPage = window.COMIC_PAGE_DATA?.pageNum ?? null;
  const previousPage = Number.parseInt(
    sessionStorage.getItem("previousPage") ?? "null",
    10,
  );

  // Clear session storage to prevent stale data affecting future navigations
  sessionStorage.removeItem("previousPage");

  // Restore menu state BEFORE view transition animates to prevent glitches
  const menuExpanded = sessionStorage.getItem("menuExpanded") === "true";
  sessionStorage.removeItem("menuExpanded");

  if (menuExpanded) {
    // Set menu to open state immediately, synchronously
    const menu = document.getElementById("expandedNavMenu");
    const btnIcon = document.querySelector("#expandableNavBtn .nav-btn-icon");
    if (menu) menu.classList.add("active");
    if (btnIcon) btnIcon.textContent = "←";
  }

  // Check if both pages are comic pages (have valid page numbers)
  const isComicTransition = currentPage !== null && !Number.isNaN(previousPage);

  if (isComicTransition) {
    // This is a comic-to-comic transition, apply slide animations
    document.documentElement.classList.add("comic-transition");

    // Determine direction - if current page number is less than previous, we're going backward
    if (currentPage < previousPage) {
      document.documentElement.classList.add("back-navigation");
    }
  }
});
