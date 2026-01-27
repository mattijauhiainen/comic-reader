# Offline Support Plan: Download Album for Offline Reading

## Overview

Add service worker-based offline support with explicit "Download for Offline" functionality. Each album is versioned independently, and updates are optional - users can continue reading old cached content until they choose to update.

## Key Design Decisions

### 1. Per-Album Versioning

**Problem:** Site-wide versioning means updating one album invalidates all cached albums.

**Solution:** Each album has its own version in the manifest.

```json
{
  "sharedVersion": "2024-01-27T12:00:00.000Z",
  "albums": {
    "pizarro": {
      "version": "2024-01-27T12:00:00.000Z",
      "title": "Tintin and the Picaros",
      "totalPages": 62,
      "files": ["pizarro/page1.html", "pizarro/page1.avif", ...]
    },
    "lotus": {
      "version": "2024-01-20T10:00:00.000Z",
      "title": "The Blue Lotus",
      "totalPages": 62,
      "files": [...]
    }
  },
  "shared": ["index.html", "styles/variables.css", ...]
}
```

**Cache structure:**
- `comics-shared-v{sharedVersion}` - CSS, JS, index.html
- `comics-album-pizarro-v{albumVersion}` - pizarro content only
- `comics-album-lotus-v{albumVersion}` - lotus content only

Updating pizarro does NOT invalidate the lotus cache.

### 2. Cache-First Strategy with Optional Refresh

**Problem:** Automatic cache invalidation forces re-download, bad UX if offline.

**Solution:** Downloaded albums always serve from cache, even when online.

**Behavior:**
- Once an album is downloaded, it ALWAYS serves from cache
- This is true whether online or offline - consistent experience
- User must explicitly click "Update" to get newer content
- The "Update Available" badge informs, but doesn't force action

**Flow when album is updated:**
1. User visits site with outdated album cache
2. Manifest shows newer album version exists
3. **SW serves cached content regardless of online status**
4. UI shows "Update available" badge on album
5. User clicks "Update" when convenient
6. New version downloaded, then old cache deleted

**Benefits:**
- Consistent experience: what you downloaded is what you see
- Never lose offline access unexpectedly
- User controls when to use bandwidth
- Predictable behavior (no surprising content changes)

### 3. Index Page On-Demand Caching

- Service worker caches `index.html` and shared assets on-demand when visited
- Allows users to always access the album list offline
- Album content requires explicit download action

### 4. Asset Coherence

- Each album version is a complete, self-contained unit
- Download button fetches ALL album files atomically
- Only marked "available offline" when 100% complete
- If download fails partway, old version (if any) remains intact

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `reader/sw.js` | Service worker - fetch interception, per-album caching |
| `reader/scripts/offline-manager.js` | API for download/status/update checks |
| `reader/styles/offline-ui.css` | Styles for download button, progress, update badge |
| `reader/cache-manifest.json` | Generated manifest with per-album versions |

### Modified Files

| File | Changes |
|------|---------|
| `generator/generate-pages.ts` | Add manifest generation, SW registration |
| `reader/index.html` | Will be regenerated with download UI |

---

## Implementation Steps

### Step 1: Manifest Generation

Modify `generate-pages.ts` to output `cache-manifest.json` with per-album versions:

```typescript
function generateManifest(albumFolder: string, totalPages: number): void {
  const albumVersion = new Date().toISOString();

  // Read existing manifest to preserve other albums' versions
  let existingManifest = { albums: {} };
  try {
    existingManifest = JSON.parse(fs.readFileSync("reader/cache-manifest.json", "utf-8"));
  } catch {}

  const manifest = {
    sharedVersion: new Date().toISOString(),
    albums: {
      ...existingManifest.albums,
      [albumFolder]: {
        version: albumVersion,
        title: config.albumTitle,
        totalPages,
        files: [
          ...Array.from({length: totalPages}, (_, i) => `${albumFolder}/page${i+1}.html`),
          ...Array.from({length: totalPages}, (_, i) => `${albumFolder}/page${i+1}.avif`)
        ]
      }
    },
    shared: [
      "index.html",
      "favicon.svg",
      "styles/variables.css",
      "styles/reader.css",
      "styles/view-transitions.css",
      "styles/comic-nav-menu.css",
      "styles/translation-overlay.css",
      "styles/offline-ui.css",
      "scripts/navigation-state.js",
      "scripts/comic-nav-menu.js",
      "scripts/panel-navigator.js",
      "scripts/translation-overlay.js",
      "scripts/translation-bubbles.js",
      "scripts/offline-manager.js",
      "sw.js",
      "cache-manifest.json"
    ]
  };
  fs.writeFileSync("reader/cache-manifest.json", JSON.stringify(manifest, null, 2));
}
```

### Step 2: Service Worker (`reader/sw.js`)

```javascript
const MANIFEST_URL = '/cache-manifest.json';

async function getManifest() {
  const response = await fetch(MANIFEST_URL);
  return response.json();
}

function getSharedCacheName(version) {
  return `comics-shared-v${version}`;
}

function getAlbumCacheName(albumId, version) {
  return `comics-album-${albumId}-v${version}`;
}

self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  event.respondWith(handleFetch(event.request, url));
});

async function handleFetch(request, url) {
  // CACHE-FIRST: Always serve from cache if available
  // This ensures consistent experience whether online or offline
  const allCaches = await caches.keys();

  for (const cacheName of allCaches) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
  }

  // Not in cache - fetch from network
  try {
    const response = await fetch(request);

    // Cache shared assets on-demand (not album content - that requires explicit download)
    const manifest = await getManifest();
    const isShared = manifest.shared.some(f =>
      url.pathname === `/${f}` || url.pathname === `/${f.replace(/^\//, '')}`
    );

    if (isShared || url.pathname === '/' || url.pathname === '/index.html') {
      const sharedCache = await caches.open(getSharedCacheName(manifest.sharedVersion));
      sharedCache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed and not in cache - return offline page or error
    throw error;
  }
}

// Message handler for downloading albums
self.addEventListener('message', (event) => {
  if (event.data.type === 'DOWNLOAD_ALBUM') {
    downloadAlbum(event.data.albumId, event.source);
  }
  if (event.data.type === 'DELETE_ALBUM') {
    deleteAlbumCache(event.data.albumId);
  }
});

async function downloadAlbum(albumId, client) {
  const manifest = await getManifest();
  const album = manifest.albums[albumId];
  if (!album) return;

  const cacheName = getAlbumCacheName(albumId, album.version);
  const cache = await caches.open(cacheName);

  const total = album.files.length;
  let completed = 0;

  for (const file of album.files) {
    try {
      const response = await fetch(`/${file}`);
      await cache.put(`/${file}`, response);
      completed++;
      client.postMessage({
        type: 'DOWNLOAD_PROGRESS',
        albumId,
        completed,
        total
      });
    } catch (error) {
      client.postMessage({
        type: 'DOWNLOAD_ERROR',
        albumId,
        error: error.message
      });
      return;
    }
  }

  // Delete old version caches for this album
  const allCaches = await caches.keys();
  for (const name of allCaches) {
    if (name.startsWith(`comics-album-${albumId}-`) && name !== cacheName) {
      await caches.delete(name);
    }
  }

  client.postMessage({ type: 'DOWNLOAD_COMPLETE', albumId });
}

async function deleteAlbumCache(albumId) {
  const allCaches = await caches.keys();
  for (const name of allCaches) {
    if (name.startsWith(`comics-album-${albumId}-`)) {
      await caches.delete(name);
    }
  }
}
```

### Step 3: Offline Manager (`reader/scripts/offline-manager.js`)

```javascript
export class OfflineManager {
  constructor() {
    this.manifest = null;
    this.listeners = new Map();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
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

  onProgress(albumId, callback) {
    if (!this.listeners.has(albumId)) {
      this.listeners.set(albumId, []);
    }
    this.listeners.get(albumId).push(callback);
  }

  async loadManifest() {
    if (!this.manifest) {
      this.manifest = await fetch('/cache-manifest.json').then(r => r.json());
    }
    return this.manifest;
  }

  async getAlbumStatus(albumId) {
    const manifest = await this.loadManifest();
    const album = manifest.albums[albumId];
    if (!album) return { available: false, updateAvailable: false };

    const allCaches = await caches.keys();
    const albumCaches = allCaches.filter(n => n.startsWith(`comics-album-${albumId}-`));

    if (albumCaches.length === 0) {
      return { available: false, updateAvailable: false };
    }

    const currentCacheName = `comics-album-${albumId}-v${album.version}`;
    const hasCurrentVersion = albumCaches.includes(currentCacheName);

    return {
      available: true,
      updateAvailable: !hasCurrentVersion,
      cachedVersion: albumCaches[0].replace(`comics-album-${albumId}-v`, ''),
      latestVersion: album.version
    };
  }

  async downloadAlbum(albumId) {
    const registration = await navigator.serviceWorker.ready;
    registration.active.postMessage({ type: 'DOWNLOAD_ALBUM', albumId });
  }

  async deleteAlbum(albumId) {
    const registration = await navigator.serviceWorker.ready;
    registration.active.postMessage({ type: 'DELETE_ALBUM', albumId });
  }
}

export const offlineManager = new OfflineManager();
```

### Step 4: Update Index Page

The index.html needs UI for:
- Download button per album (shows progress during download)
- Offline status indicator (checkmark when available offline)
- Update available badge (when newer version exists)

### Step 5: Register Service Worker

Add to all generated HTML pages:

```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

---

## Cache Lifecycle

```
[User visits index.html]
       ↓
[SW caches shared assets on-demand]
       ↓
[User clicks "Download" on Pizarro album]
       ↓
[SW creates comics-album-pizarro-v{version} cache]
       ↓
[All Pizarro files cached, UI shows "Available Offline"]
       ↓
[Later: Pizarro regenerated with new translations]
       ↓
[User revisits → manifest shows new pizarro.version]
       ↓
[Old cache STILL WORKS → UI shows "Update Available"]
       ↓
[User clicks "Update" when convenient]
       ↓
[New version downloaded, old cache deleted]
```

**Key behavior:** Other albums (e.g., Lotus) are completely unaffected by Pizarro updates.

---

## UI States for Album Card

| State | Display |
|-------|---------|
| Not downloaded | "Download for Offline" button |
| Downloading | Progress bar with percentage |
| Available offline | Checkmark + "Available Offline" |
| Update available | Checkmark + "Update Available" badge |

---

## Verification

1. Run `bun run generate` → verify `cache-manifest.json` has per-album versions
2. Run `bun run serve` → verify SW registers
3. Download album → go offline → album works
4. Modify translation → regenerate → verify:
   - Old cached content still works
   - "Update available" badge appears
   - Other albums unaffected
5. Click update → verify new content loads, old cache deleted
