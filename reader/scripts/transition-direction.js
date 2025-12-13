// Detect navigation direction for view transitions
// Adds 'back-navigation' class to <html> when navigating to a previous page

// Store the current page number before navigating away
window.addEventListener("pageswap", (event) => {
  if (event.viewTransition) {
    const currentPage = window.COMIC_PAGE_DATA?.pageNum || 0;
    sessionStorage.setItem("previousPage", currentPage.toString());
  }
});

// Check navigation direction when the new page loads
window.addEventListener("pagereveal", (event) => {
  // Only process if a view transition is happening
  if (!event.viewTransition) return;

  const currentPage = window.COMIC_PAGE_DATA?.pageNum || 0;
  const previousPage = parseInt(sessionStorage.getItem("previousPage") || "0");

  // If current page number is less than previous, we're going backward
  if (currentPage < previousPage) {
    document.documentElement.classList.add("back-navigation");
  }
});
