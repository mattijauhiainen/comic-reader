/**
 * OfflineManager handles album downloads, status checks, and update detection.
 * Downloads happen in the service worker; this class communicates via postMessage.
 */
export class OfflineManager {
  constructor() {
    this.manifest = null;
    this.listeners = new Map();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        this.handleMessage(event.data);
      });
    }
  }

  handleMessage(data) {
    const listeners = this.listeners.get(data.albumId) || [];
    for (const listener of listeners) {
      listener(data);
    }
  }

  /**
   * Register a callback for download progress/completion/error events.
   * @param {string} albumId - The album identifier
   * @param {function} callback - Called with {type, albumId, completed?, total?, error?}
   */
  onProgress(albumId, callback) {
    if (!this.listeners.has(albumId)) {
      this.listeners.set(albumId, []);
    }
    this.listeners.get(albumId).push(callback);
  }

  /**
   * Load the cache manifest from the server.
   */
  async loadManifest() {
    if (!this.manifest) {
      const response = await fetch("/cache-manifest.json");
      if (!response.ok) {
        throw new Error(`Failed to load manifest: HTTP ${response.status}`);
      }
      this.manifest = await response.json();
    }
    return this.manifest;
  }

  /**
   * Get the offline status of an album.
   * @param {string} albumId - The album identifier
   * @returns {Promise<{available: boolean}>}
   */
  async getAlbumStatus(albumId) {
    const allCacheNames = await caches.keys();
    const hasCache = allCacheNames.some((n) =>
      n.startsWith(`comics-album-${albumId}-`),
    );
    return { available: hasCache };
  }

  /**
   * Request the service worker to download an album.
   * Listen for progress via onProgress().
   * @param {string} albumId - The album identifier
   */
  async downloadAlbum(albumId) {
    const registration = await navigator.serviceWorker.ready;
    registration.active.postMessage({ type: "DOWNLOAD_ALBUM", albumId });
  }

  /**
   * Get the list of available albums from the manifest.
   * @returns {Promise<Array<{id: string, title: string, totalPages: number}>>}
   */
  async getAlbums() {
    const manifest = await this.loadManifest();
    return Object.entries(manifest.albums).map(([id, album]) => ({
      id,
      title: album.title,
      totalPages: album.totalPages,
    }));
  }

  /**
   * Check if service workers are supported.
   * @returns {boolean}
   */
  static isSupported() {
    return "serviceWorker" in navigator && "caches" in window;
  }
}
