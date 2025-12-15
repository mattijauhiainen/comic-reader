# Bubble Debug Feature Plan

## Overview
Change the static site generation to embed panel and bubble data directly into HTML pages instead of fetching them. Add a debug visualization feature to display detected speech bubbles and text regions on the rendered page.

## Current Architecture

### Static Site Generation (generator/generate-pages.ts)
- Scans assets/pizarro/ for JSON files to determine page count
- Copies all assets (images, panel JSONs, bubble JSONs) from assets/ to reader/
- Generates HTML pages with `COMIC_PAGE_DATA` object containing:
  - `pageNum`, `totalPages`, `album`, `imagePath`
  - `panelDataPath`: path to JSON file (e.g., "./page1.json")

### Current Data Flow
1. HTML page loads with `panelDataPath` reference
2. panel-navigator.js:14-29 fetches the JSON file via `loadPanelData()`
3. Panel data is parsed and used for zoom navigation

### Panel Data Structure (page1.json)
```json
{
  "imagePath": "../assets/pizarro/page1.avif",
  "dimensions": { "width": 3024, "height": 4032 },
  "panels": [ /* array of panel objects with id, x, y, width, height */ ],
  "metadata": { "extractedAt": "..." }
}
```

### Bubble Data Structure (page1-bubbles.json)
```json
{
  "image_info": { "path": "...", "width": 3024, "height": 4032 },
  "detections": [
    {
      "label": "text_bubble" | "text_free" | "bubble",
      "label_id": 1 | 2 | 0,
      "confidence": 0.9704,
      "bbox": { "x1": 1179.53, "y1": 1997.75, "x2": 1919.11, "y2": 2300.9 }
    }
  ],
  "model": "ogkalu/comic-text-and-bubble-detector",
  "threshold": 0.3
}
```

## Proposed Changes

### 1. Modify Static Site Generator (generator/generate-pages.ts)

#### 1.1 Read and Embed Panel Data
- In `generatePageHTML()`, read the panel JSON file for each page
- Embed panel data directly into `COMIC_PAGE_DATA` object
- Remove `panelDataPath` property (no longer needed)
- Add `panels` and `dimensions` properties to `COMIC_PAGE_DATA`

**Before:**
```typescript
window.COMIC_PAGE_DATA = {
  pageNum: 1,
  totalPages: 29,
  album: "pizarro",
  imagePath: "./page1.avif",
  panelDataPath: "./page1.json"
};
```

**After:**
```typescript
window.COMIC_PAGE_DATA = {
  pageNum: 1,
  totalPages: 29,
  album: "pizarro",
  imagePath: "./page1.avif",
  dimensions: { width: 3024, height: 4032 },
  panels: [ /* full panel array */ ],
  bubbles: [ /* filtered bubble detections */ ]
};
```

#### 1.2 Read and Filter Bubble Data
- Read bubble JSON file (e.g., `assets/pizarro/page1-bubbles.json`)
- Filter detections to include only:
  - `label_id === 1` (text_bubble)
  - `label_id === 2` (text_free)
- Exclude `label_id === 0` (bubble) detections
- Embed filtered bubbles into `COMIC_PAGE_DATA.bubbles`

#### 1.3 Update copyAssets Function
- Currently copies all files from assets/ to reader/
- After embedding data, panel JSONs and bubble JSONs don't need to be copied
- Update to copy only image files (.avif, .png, etc.)
- This reduces reader/ folder size and eliminates redundant data

### 2. Update Panel Navigator (reader/scripts/panel-navigator.js)

#### 2.1 Remove Fetch Logic
- Delete `loadPanelData()` function (lines 14-29)
- Panel data is now available directly from `window.COMIC_PAGE_DATA`

#### 2.2 Update Initialization
- In `initialize()` function (lines 215-229):
  - Change `panels = await loadPanelData(currentPage)` to `panels = window.COMIC_PAGE_DATA.panels || []`
  - Change `imageSize` assignment to use `window.COMIC_PAGE_DATA.dimensions`
  - Remove `async` from function signature (no longer needed)

**Before:**
```javascript
async function initialize() {
  currentPage = window.COMIC_PAGE_DATA.pageNum;
  totalPages = window.COMIC_PAGE_DATA.totalPages;
  panels = await loadPanelData(currentPage);
  // ...
}
```

**After:**
```javascript
function initialize() {
  currentPage = window.COMIC_PAGE_DATA.pageNum;
  totalPages = window.COMIC_PAGE_DATA.totalPages;
  panels = window.COMIC_PAGE_DATA.panels || [];
  imageSize = window.COMIC_PAGE_DATA.dimensions;
  // ...
}
```

### 3. Add Bubble Debug Visualization

#### 3.1 Create New Bubble Overlay Module (reader/scripts/bubble-debug.js)
Create a new script to handle bubble visualization:

**Features:**
- Toggle bubble visualization on/off (keyboard shortcut: 'B' key)
- Render bubble bounding boxes as colored overlays on the page
- Different colors for different bubble types:
  - Green for text_bubble (label_id: 1)
  - Orange for text_free (label_id: 2)
- Display confidence scores
- Overlay should be positioned absolutely over the comic image
- Scale bubble coordinates to match rendered image size

**Implementation approach:**
- Create a `<div class="bubble-overlay">` container
- Position it absolutely over the viewport image
- For each bubble in `window.COMIC_PAGE_DATA.bubbles`:
  - Create a `<div class="bubble-box">` with:
    - Absolute positioning based on bbox coordinates
    - Border color matching bubble type
    - Semi-transparent background
    - Confidence score label
- Transform bubble coordinates from original image space to rendered image space
  - Similar to panel zoom calculation in panel-navigator.js:38-54
  - Account for CSS object-fit: contain scaling
- Handle window resize to recalculate bubble positions
- Toggle visibility with keyboard shortcut

#### 3.2 Add Bubble Overlay Styles (reader/styles/reader.css)
Add CSS for bubble debug overlay:
```css
.bubble-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  display: none; /* Hidden by default */
}

.bubble-overlay.visible {
  display: block;
}

.bubble-box {
  position: absolute;
  border: 2px solid;
  box-sizing: border-box;
  pointer-events: none;
}

.bubble-box.text-bubble {
  border-color: rgba(0, 255, 0, 0.8); /* Green */
  background-color: rgba(0, 255, 0, 0.1);
}

.bubble-box.text-free {
  border-color: rgba(255, 165, 0, 0.8); /* Orange */
  background-color: rgba(255, 165, 0, 0.1);
}

.bubble-box .confidence-label {
  position: absolute;
  top: -20px;
  left: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 5px;
  font-size: 11px;
  border-radius: 3px;
  white-space: nowrap;
}
```

#### 3.3 Update Page Template (generator/generate-pages.ts)
Add bubble debug script and overlay container to generated HTML:

```html
<script type="module" src="../scripts/bubble-debug.js"></script>
```

Add bubble overlay div to page body:
```html
<main class="viewport">
  <img id="pageImage" src="${info.imagePath}" alt="Page ${info.pageNum}">
  <div class="bubble-overlay" id="bubbleOverlay"></div>
</main>
```

## Implementation Steps

1. **Update generate-pages.ts:**
   - Add types for panel data and bubble data
   - Implement `readPanelData()` function to read JSON files
   - Implement `readBubbleData()` function to read and filter bubble JSON files
   - Modify `generatePageHTML()` to embed data in script tag
   - Update `copyAssets()` to skip JSON files

2. **Update panel-navigator.js:**
   - Remove `loadPanelData()` function
   - Update `initialize()` to use embedded data
   - Remove async/await from initialization

3. **Create bubble-debug.js:**
   - Implement bubble overlay rendering
   - Add coordinate transformation logic
   - Add keyboard event handler for toggle
   - Handle window resize events

4. **Update reader.css:**
   - Add styles for bubble overlay and bubble boxes

5. **Test:**
   - Regenerate static pages with new generator
   - Verify panels work correctly without fetch
   - Test bubble overlay toggle
   - Verify bubble positioning at different viewport sizes
   - Check that bubbles scale correctly when zoomed to panels

## Future Cleanup

As mentioned by user, this bubble debug feature is temporary. When removing it:
- Delete reader/scripts/bubble-debug.js
- Remove bubble-debug.js script tag from generated HTML
- Remove bubble overlay div from generated HTML
- Remove bubble-related CSS from reader.css
- Keep bubble data embedding in generator (might be useful for future features)
- Or remove `bubbles` from `COMIC_PAGE_DATA` entirely if not needed

## Benefits

1. **Performance:** Eliminates HTTP fetch request for panel data on each page load
2. **Simplicity:** All page data is self-contained in the HTML
3. **Offline:** Pages work completely offline without needing to serve JSON files
4. **Debug:** Bubble visualization helps validate bubble detection quality
5. **Reduced size:** No redundant JSON files in reader/ folder

## Trade-offs

1. **HTML size:** Embedding data increases HTML file size slightly
   - Panel JSON: ~1-2KB per page
   - Filtered bubble JSON: ~2-3KB per page (after filtering)
   - Total increase: ~3-5KB per page (negligible for modern browsers)
2. **Cache:** Changes to panel/bubble data require regenerating HTML
   - This is already the current workflow, so no change to process
