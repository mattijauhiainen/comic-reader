import { getProgress } from "./reading-progress.js";

function initProgressUI() {
  const albumCards = document.querySelectorAll(".album-card");

  for (const card of albumCards) {
    const link = card.querySelector("a");
    if (!link) continue;

    const albumId = card.dataset.album;
    const progress = getProgress(albumId);

    const pageCountEl = link.querySelector("p");
    const totalPagesMatch = pageCountEl.textContent.match(/(\d+)\s+pages/);
    if (!totalPagesMatch) continue;
    const totalPages = Number.parseInt(totalPagesMatch[1], 10);

    // Only show progress if user has read past page 1
    if (progress && progress > 1) {
      // Update link to go to last read page
      link.href = `${albumId}/page${progress}.html`;
      pageCountEl.textContent = `Read ${progress} out of ${totalPages} pages`;
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initProgressUI);
} else {
  initProgressUI();
}
