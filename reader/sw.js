const MANIFEST_URL = "/cache-manifest.json";

let cachedManifest = null;

async function getManifest() {
  if (!cachedManifest) {
    cachedManifest = await (await fetch(MANIFEST_URL)).json();
  }
  return cachedManifest;
}

function getSharedCacheName(version) {
  return `comics-shared-v${version}`;
}

function getAlbumCacheName(albumId, version) {
  return `comics-album-${albumId}-v${version}`;
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      await refreshStaleCaches();
    })(),
  );
});

/**
 * Check for stale caches and refresh them if needed.
 * Called on activate (when SW updates).
 */
async function refreshStaleCaches() {
  const manifest = await getManifest();
  const allCacheNames = await caches.keys();

  // Check if user has any cached albums
  const hasAnyCachedAlbums = allCacheNames.some((n) =>
    n.startsWith("comics-album-"),
  );

  // If user has cached albums, ensure shared assets are up to date
  if (hasAnyCachedAlbums) {
    await refreshSharedAssets(manifest, allCacheNames);
  }

  // Refresh any stale album caches
  await refreshStaleAlbums(manifest, allCacheNames);
}

/**
 * Refresh shared assets if version has changed.
 */
async function refreshSharedAssets(manifest, allCacheNames) {
  const currentSharedCacheName = getSharedCacheName(manifest.shared.version);
  const staleSharedCaches = allCacheNames.filter(
    (n) => n.startsWith("comics-shared-") && n !== currentSharedCacheName,
  );

  // Only refresh if we have stale shared caches (version changed)
  if (staleSharedCaches.length > 0) {
    console.log("Refreshing stale shared assets");
    await cacheSharedAssets(manifest);

    // Delete old shared caches
    for (const name of staleSharedCaches) {
      await caches.delete(name);
    }
  }
}

/**
 * Cache all shared assets.
 */
async function cacheSharedAssets(manifest) {
  const sharedCacheName = getSharedCacheName(manifest.shared.version);
  const sharedCache = await caches.open(sharedCacheName);

  for (const file of manifest.shared.files) {
    const response = await fetch(`/${file}`);
    if (response.ok) {
      await sharedCache.put(`/${file}`, response);
    }
  }
}

/**
 * Refresh any stale album caches.
 */
async function refreshStaleAlbums(manifest, allCacheNames) {
  for (const [albumId, album] of Object.entries(manifest.albums)) {
    const currentCacheName = getAlbumCacheName(albumId, album.version);
    const staleCaches = allCacheNames.filter(
      (n) => n.startsWith(`comics-album-${albumId}-`) && n !== currentCacheName,
    );

    // Only refresh if we have a stale cached version
    if (staleCaches.length > 0) {
      console.log(`Refreshing stale album: ${albumId}`);
      await refreshAlbum(albumId, album);

      // Delete old caches
      for (const name of staleCaches) {
        await caches.delete(name);
      }
    }
  }
}

async function refreshAlbum(albumId, album) {
  const cacheName = getAlbumCacheName(albumId, album.version);
  const cache = await caches.open(cacheName);

  for (const file of album.files) {
    const response = await fetch(`/${file}`);
    if (response.ok) {
      await cache.put(`/${file}`, response);
    }
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;

  event.respondWith(handleFetch(event.request, url));
});

async function handleFetch(request, url) {
  const allCacheNames = await caches.keys();
  const albumCacheNames = allCacheNames.filter((n) =>
    n.startsWith("comics-album-"),
  );

  // CACHE-FIRST for album content (explicitly downloaded)
  // Try both original URL and with .html suffix (for Netlify pretty URLs)
  const urlsToTry = [request.url];
  if (!url.pathname.endsWith(".html") && !url.pathname.endsWith("/")) {
    urlsToTry.push(`${request.url}.html`);
  }

  for (const cacheName of albumCacheNames) {
    const cache = await caches.open(cacheName);
    for (const tryUrl of urlsToTry) {
      const cached = await cache.match(tryUrl);
      if (cached) return cached;
    }
  }

  // NETWORK-FIRST for shared assets (HTML, JS, CSS)
  try {
    return await fetch(request);
  } catch (error) {
    // Network failed - try shared cache as fallback
    const sharedCacheNames = allCacheNames.filter((n) =>
      n.startsWith("comics-shared-"),
    );
    for (const cacheName of sharedCacheNames) {
      const cache = await caches.open(cacheName);
      for (const tryUrl of urlsToTry) {
        const cached = await cache.match(tryUrl);
        if (cached) return cached;
      }
    }
    throw error;
  }
}

// Message handler for downloading/deleting albums
self.addEventListener("message", (event) => {
  if (event.data.type === "DOWNLOAD_ALBUM") {
    downloadAlbum(event.data.albumId, event.source);
  }
});

async function downloadAlbum(albumId, client) {
  const manifest = await getManifest();
  const album = manifest.albums[albumId];
  if (!album) {
    client.postMessage({
      type: "DOWNLOAD_ERROR",
      albumId,
      error: "Album not found",
    });
    return;
  }

  // Cache shared assets first (needed for offline reading)
  await cacheSharedAssets(manifest);

  // Delete old shared caches
  const allCacheNames = await caches.keys();
  const currentSharedCacheName = getSharedCacheName(manifest.shared.version);
  for (const name of allCacheNames) {
    if (name.startsWith("comics-shared-") && name !== currentSharedCacheName) {
      await caches.delete(name);
    }
  }

  // Cache album files
  const cacheName = getAlbumCacheName(albumId, album.version);
  const cache = await caches.open(cacheName);

  const total = album.files.length;
  let completed = 0;

  for (const file of album.files) {
    try {
      const response = await fetch(`/${file}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      await cache.put(`/${file}`, response);
      completed++;
      client.postMessage({
        type: "DOWNLOAD_PROGRESS",
        albumId,
        completed,
        total,
      });
    } catch (error) {
      client.postMessage({
        type: "DOWNLOAD_ERROR",
        albumId,
        error: error.message,
      });
      return;
    }
  }

  // Delete old version caches for this album
  for (const name of allCacheNames) {
    if (name.startsWith(`comics-album-${albumId}-`) && name !== cacheName) {
      await caches.delete(name);
    }
  }

  client.postMessage({ type: "DOWNLOAD_COMPLETE", albumId });
}
