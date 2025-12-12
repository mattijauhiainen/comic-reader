# Panel-Level Navigation with Zoom - Implementation Plan

## Overview

Transform the comic reader from page-level navigation to panel-level navigation with zoom transitions. The reader will zoom into individual panels sequentially, creating a guided reading experience.

## Current State

- **Navigation**: Page-to-page using HTML `<a>` links
- **Panel Data**: Pre-extracted panel coordinates stored in `reader/assets/{album}/page{N}.json`
- **Client-Side**: Pure HTML/CSS, no JavaScript
- **Viewport**: Full page scaled to fit viewport using CSS `object-fit: contain`

## Target Behavior

1. **Initial Load**: Full page contained in viewport (current behavior)
2. **First Next**: Zoom to first panel, cropping viewport to panel bounds
3. **Subsequent Next**: Zoom to next panel on same page
4. **Back**: Return to previous panel, or full page view from first panel, or previous page (full view) from full page view
5. **Page Transition**: After last panel, next click loads next page (full view)

## Implementation Strategy

### Phase 1: Add Client-Side Navigation State

**File**: Create `reader/scripts/panel-navigator.js`

**Purpose**: Manage navigation state and panel transitions

**State to Track**:
```typescript
interface NavigationState {
  currentPage: number;          // Current page number (1-indexed)
  currentPanel: number | null;  // Current panel ID (0-indexed), null = full page view
  totalPages: number;           // Total pages in album
  panels: Panel[];              // Panel data for current page
  pageBasename: string;         // e.g., "page1"
}
```

**Key Functions**:
- `loadPanelData(pageNum)`: Fetch and parse JSON panel data
- `goNext()`: Navigate to next panel or page
- `goBack()`: Navigate to previous panel or page
- `zoomToPanel(panelId)`: Animate viewport to panel bounds
- `zoomToFullPage()`: Reset to full page view

### Phase 2: Implement Zoom Mechanism

**Files**:
- `reader/scripts/panel-navigator.js` (zoom logic)
- `reader/styles/reader.css` (zoom styles)

**Approach**: CSS Transform-based zoom (GPU-accelerated)

**CSS Changes**:
```css
.viewport {
  overflow: hidden;  /* Clip content outside viewport */
  position: relative;
}

.viewport img {
  /* Define CSS variables with default values */
  --translate-x: 0px;
  --translate-y: 0px;
  --scale: 1;

  /* Use variables in transform */
  transform-origin: top left;
  transform: translate(var(--translate-x), var(--translate-y)) scale(var(--scale));
  transition: transform 0.3s ease-in-out;
}
```

**JavaScript Transform Calculation**:
```typescript
function calculateZoomTransform(panel: Panel, imageSize: Dimensions, viewportSize: Dimensions) {
  // Calculate scale to fit panel in viewport (with padding)
  const padding = 20; // px
  const scaleX = (viewportSize.width - padding * 2) / panel.width;
  const scaleY = (viewportSize.height - padding * 2) / panel.height;
  const scale = Math.min(scaleX, scaleY);

  // Calculate translation to center panel in viewport
  const scaledPanelWidth = panel.width * scale;
  const scaledPanelHeight = panel.height * scale;
  const translateX = (viewportSize.width - scaledPanelWidth) / 2 - panel.x * scale;
  const translateY = (viewportSize.height - scaledPanelHeight) / 2 - panel.y * scale;

  return { scale, translateX, translateY };
}
```

**Apply Transform**:
```typescript
function zoomToPanel(panelId: number) {
  const panel = panels[panelId];
  const { scale, translateX, translateY } = calculateZoomTransform(
    panel,
    imageSize,
    { width: window.innerWidth, height: window.innerHeight }
  );

  const img = document.querySelector('.viewport img');
  // Update CSS variables to trigger transform
  img.style.setProperty('--translate-x', `${translateX}px`);
  img.style.setProperty('--translate-y', `${translateY}px`);
  img.style.setProperty('--scale', scale);
}

function zoomToFullPage() {
  const img = document.querySelector('.viewport img');
  // Reset to default values
  img.style.setProperty('--translate-x', '0px');
  img.style.setProperty('--translate-y', '0px');
  img.style.setProperty('--scale', '1');
}
```

### Phase 3: Update Navigation Logic

**Navigation Flow**:

```
State Machine (Within a Single Page):
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  [Full Page View]                                            │
│   currentPanel = null                                        │
│         │                 ▲                                   │
│         │ NEXT            │ BACK (from panel 0)              │
│         ▼                 │                                   │
│  [Panel View: Panel 0]    │                                  │
│   currentPanel = 0        │                                  │
│         │                 ▲                                   │
│         │ NEXT            │ BACK                             │
│         ▼                 │                                   │
│  [Panel View: Panel 1]    │                                  │
│   currentPanel = 1        │                                  │
│         │                 │                                   │
│         │ NEXT            │ BACK                             │
│         ▼                 ▲                                   │
│         ...              ...                                  │
│         │                 │                                   │
│         │ NEXT (last)     │                                   │
│         ▼                 │                                   │
│  [Navigate to Next Page (full view)]                         │
│                                                               │
│  From full page view:                                        │
│    BACK → Navigate to Previous Page (full view)             │
└─────────────────────────────────────────────────────────────┘
```

**goNext() Logic**:
```typescript
function goNext() {
  if (currentPanel === null) {
    // Currently viewing full page → zoom to first panel
    if (panels.length > 0) {
      currentPanel = 0;
      zoomToPanel(currentPanel);
      updateNavigationUI();
    } else {
      // No panels detected, go to next page
      navigateToPage(currentPage + 1);
    }
  } else if (currentPanel < panels.length - 1) {
    // More panels on this page → zoom to next panel
    currentPanel++;
    zoomToPanel(currentPanel);
    updateNavigationUI();
  } else {
    // Last panel → go to next page
    if (currentPage < totalPages) {
      navigateToPage(currentPage + 1);
    }
  }
}
```

**goBack() Logic**:
```typescript
function goBack() {
  if (currentPanel === null) {
    // Currently viewing full page → go to previous page (full view)
    if (currentPage > 1) {
      window.location.href = `page${currentPage - 1}.html`;
    }
  } else if (currentPanel > 0) {
    // Not first panel → go to previous panel
    currentPanel--;
    zoomToPanel(currentPanel);
    updateNavigationUI();
  } else {
    // First panel → return to full page view
    currentPanel = null;
    zoomToFullPage();
    updateNavigationUI();
  }
}
```

**navigateToPage() (Cross-Page Navigation)**:
```typescript
function navigateToPage(pageNum: number) {
  // Simple page navigation - new page always loads in full view
  window.location.href = `page${pageNum}.html`;
}
```

### Phase 4: Handle Page Load States

**On Page Load**:
```typescript
async function initialize() {
  // Parse page number from filename (e.g., page1.html → 1)
  const match = window.location.pathname.match(/page(\d+)\.html/);
  currentPage = parseInt(match[1]);

  // Load panel data
  panels = await loadPanelData(currentPage);

  // Always start in full page view
  currentPanel = null;
  zoomToFullPage();

  updateNavigationUI();
  attachEventHandlers();
}
```

### Phase 5: Update Navigation UI

**Navigation Indicator**: Show current position

**Update Footer** (in `generate-pages.ts`):
```html
<footer>
  <nav>
    <a id="prevBtn">←</a>
    <span id="positionIndicator">1 / 29</span>
    <a id="nextBtn">→</a>
  </nav>
</footer>
```

**Dynamic Updates**:
```typescript
function updateNavigationUI() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const indicator = document.getElementById('positionIndicator');

  // Update indicator text
  if (currentPanel === null) {
    indicator.textContent = `${currentPage} / ${totalPages}`;
  } else {
    indicator.textContent = `${currentPage} / ${totalPages} (Panel ${currentPanel + 1}/${panels.length})`;
  }

  // Update button states
  prevBtn.classList.toggle('disabled', currentPage === 1 && currentPanel === null);
  nextBtn.classList.toggle('disabled', currentPage === totalPages && currentPanel === panels.length - 1);

  // Prevent default link behavior
  prevBtn.href = 'javascript:void(0)';
  nextBtn.href = 'javascript:void(0)';
}
```

### Phase 6: Update Page Generator

**File**: `generator/generate-pages.ts`

**Changes**:
1. Include script tag for panel-navigator.js
2. Embed page metadata in HTML (page number, total pages, album name)
3. Convert navigation links to buttons (controlled by JS)

**Template Updates**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pizarro - Page ${pageNum}</title>
  <link rel="stylesheet" href="../styles/reader.css">
  <script type="module">
    // Embed page metadata
    window.COMIC_PAGE_DATA = {
      pageNum: ${pageNum},
      totalPages: ${totalPages},
      album: "${albumName}",
      imagePath: "../assets/${albumName}/page${pageNum}.avif",
      panelDataPath: "../assets/${albumName}/page${pageNum}.json"
    };
  </script>
  <script type="module" src="../scripts/panel-navigator.js"></script>
</head>
<body>
  <main class="viewport">
    <img id="pageImage" src="../assets/${albumName}/page${pageNum}.avif" alt="Page ${pageNum}">
  </main>
  <footer>
    <nav>
      <a id="prevBtn">←</a>
      <span id="positionIndicator">${pageNum} / ${totalPages}</span>
      <a id="nextBtn">→</a>
    </nav>
  </footer>
</body>
</html>
```

### Phase 7: Attach Event Handlers

**Add Click Handlers**:
```typescript
function attachEventHandlers() {
  // Click handlers for navigation buttons
  document.getElementById('nextBtn').addEventListener('click', goNext);
  document.getElementById('prevBtn').addEventListener('click', goBack);
}
```

## Edge Cases to Handle

1. **Pages Without Panels**: If panel detection failed (empty panels array), skip directly to next page
2. **Window Resize**: Recalculate transforms on resize to maintain zoom
3. **Orientation Change**: Handle mobile rotation
4. **First Page, First Panel**: Disable back button
5. **Last Page, Last Panel**: Disable next button
6. **Browser Back Button**: Currently breaks navigation (could enhance with History API later)
7. **Direct URL Access**: Always start at full page view (no panel state in URL)

## Performance Considerations

1. **CSS Transitions**: Use GPU-accelerated transforms (translate/scale)
2. **Image Preloading**: Preload next page image when viewing last panel
3. **Panel Data Caching**: Store loaded panel data in memory (don't re-fetch)
4. **Debounce Resize**: Throttle resize event handler

## Testing Checklist

- [ ] Full page → first panel zoom works
- [ ] Panel-to-panel navigation works
- [ ] Last panel → next page transition works (loads in full view)
- [ ] Back button reverses navigation correctly
- [ ] Back from first panel returns to full page view
- [ ] Back from full page goes to previous page (full view)
- [ ] Navigation indicators update correctly
- [ ] Works on pages with no panels
- [ ] Works on first and last pages
- [ ] Window resize maintains correct zoom
- [ ] Buttons disable appropriately at boundaries

## File Structure

```
reader/
├── scripts/
│   └── panel-navigator.js         (NEW - navigation logic)
├── styles/
│   └── reader.css                  (MODIFY - add zoom styles)
├── pizarro/
│   ├── page1.html                  (REGENERATE - with new template)
│   └── ...
└── assets/pizarro/
    ├── page1.json                  (EXISTING - panel data)
    └── ...

generator/
└── generate-pages.ts               (MODIFY - update HTML template)
```

## Implementation Order

1. Create `reader/scripts/panel-navigator.js` with core navigation logic
2. Update `reader/styles/reader.css` with zoom transition styles
3. Modify `generator/generate-pages.ts` to use new HTML template
4. Regenerate all page HTML files
5. Test navigation flow thoroughly
6. Handle edge cases
7. Performance optimization (preloading, resize handling)

## Future Enhancements (Out of Scope)

- Keyboard navigation (arrow keys, space, escape)
- Touch gesture support (swipe navigation)
- History API integration (back button support, shareable panel URLs)
- Smooth zoom animations with easing curves
- Panel highlighting/preview
- Double-tap to toggle full page view
- Accessibility improvements (ARIA labels, screen reader support)
