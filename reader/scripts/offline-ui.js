import { OfflineManager } from "./offline-manager.js";

class OfflineUI {
  constructor() {
    this.manager = new OfflineManager();
  }

  setContainerStatus(container, newStatus) {
    container.classList.remove(
      "status-download",
      "status-available",
      "status-downloading",
    );
    container.classList.add(`status-${newStatus}`);
  }

  async setup() {
    const albums = await this.manager.getAlbums();

    for (const album of albums) {
      const container = document.querySelector(
        `.album-card__offline[data-album="${album.id}"]`,
      );
      const downloadBtn = container.querySelector(".download-btn");
      const badge = container.querySelector(".offline-badge");
      const progress = container.querySelector(".download-progress");
      const progressFill = progress.querySelector(".download-progress__fill");
      const progressText = progress.querySelector(".download-progress__text");

      this.manager.onProgress(album.id, (data) => {
        if (data.type === "DOWNLOAD_PROGRESS") {
          const percent = (data.completed / data.total) * 100;
          progressFill.style.width = `${percent}%`;
          progressText.textContent = `${Math.round(percent)}%`;
        } else if (data.type === "DOWNLOAD_COMPLETE") {
          this.setContainerStatus(container, "available");
          badge.classList.add("offline-badge--available");
        } else if (data.type === "DOWNLOAD_ERROR") {
          console.error("Download failed:", data.error);
          this.setContainerStatus(container, "download");
          alert("Download failed. Please try again.");
        }
      });

      downloadBtn.addEventListener("click", () => {
        this.setContainerStatus(container, "downloading");
        progressFill.style.width = "0%";
        progressText.textContent = "0%";
        this.manager.downloadAlbum(album.id);
      });
    }
  }

  async refreshStatus() {
    const albums = await this.manager.getAlbums();

    for (const album of albums) {
      const container = document.querySelector(
        `.album-card__offline[data-album="${album.id}"]`,
      );
      const badge = container.querySelector(".offline-badge");
      const status = await this.manager.getAlbumStatus(album.id);

      if (status.available) {
        this.setContainerStatus(container, "available");
        badge.classList.add("offline-badge--available");
      } else {
        this.setContainerStatus(container, "download");
        badge.classList.remove("offline-badge--available");
      }
    }
  }

  async init() {
    await this.setup();
    this.refreshStatus();
  }
}

if (!OfflineManager.isSupported()) {
  document.body.classList.add("no-offline-support");
} else {
  const offlineUI = new OfflineUI();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => offlineUI.init());
  } else {
    offlineUI.init();
  }

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      offlineUI.refreshStatus();
    }
  });
}
