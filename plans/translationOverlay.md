# Translation Overlay Implementation Plan

## Overview
Add an interactive translation overlay system that displays detailed Chinese-to-English translations when users click on text bubbles in the comic reader.

## Requirements Summary
- Click bubble → show translation overlay
- Overlay content: sentences with vocabulary & grammar, then full translation
- Smart positioning: doesn't cover bubble or navigation, responsive layout
- Optional zoom-out for space, with restoration on dismiss
- Dismiss on click/tap anywhere or navigation

## Architecture

### 1. Data Loading & Integration

**Files to modify:**
- `generator/generate-pages.ts`

**Changes:**
1. Load `page*-translation.json` alongside existing page data
2. Add translation data to `window.COMIC_PAGE_DATA` object:
   ```javascript
   window.COMIC_PAGE_DATA = {
     pageNumber: 1,
     totalPages: 87,
     panels: [...],
     bubbles: [...],
     ocrResults: [...],
     translations: [...] // NEW: array of TranslationResult objects
   };
   ```
3. Handle missing translation files gracefully (e.g., page 2+ won't have translations yet)

**Notes:**
- Translation JSON is the source of truth for bounding boxes
- Each translation has: bbox, original_text, translation_result with sentences array

---

### 2. Translation Bubbles System

**New file:**
- `reader/scripts/translation-bubbles.js` (independent from bubble-debug.js)

**Build translation bubble overlays from scratch:**

1. **Render clickable translation overlays:**
   - Read translation data from `window.COMIC_PAGE_DATA.translations`
   - For each translation in the array, create a clickable overlay element using its bbox
   - Use same coordinate transformation logic as bubble-debug.js (image space → screen space)
   - Position overlays on top of the image
   - Only bubbles with translations in the JSON will be clickable

2. **Visual styling:**
   - Translucent overlay (mostly invisible, just for clicking)
   - Add `cursor: pointer` on hover
   - Optional: subtle border/highlight on hover to indicate clickable area
   - Z-index between image and existing debug bubbles
   - Consider: subtle pulsing animation or glow to indicate interactive bubbles

3. **Click handlers:**
   - Add click event listener to each translation bubble overlay
   - On click:
     - Get translation data from the clicked element
     - Call TranslationOverlayManager to show translation panel
     - Pass bubble's screen coordinates for positioning

4. **Responsive updates:**
   - Recalculate positions on window resize (with debounce)
   - Update when image zoom/transform changes

**Note:** This is completely separate from bubble-debug.js, which is just for debugging. Translation bubbles are always active (not toggled with 'B' key).

---

### 3. Translation Overlay Component

**New files:**
- `reader/scripts/translation-overlay.js`
- `reader/styles/translation-overlay.css`

**Overlay Manager Class (`translation-overlay.js`):**

```javascript
class TranslationOverlayManager {
  constructor(navigator) {
    this.navigator = navigator; // Reference to PanelNavigator for zoom control
    this.overlayElement = null;
    this.isVisible = false;
    this.originalZoomState = null;
    this.currentTranslation = null;
  }

  show(translation, bubbleBounds) {
    // 1. Save current zoom state
    // 2. Calculate overlay position
    // 3. Determine if zoom-out needed
    // 4. Apply zoom-out if necessary
    // 5. Build and render overlay content
    // 6. Position overlay
    // 7. Add dismiss handlers
  }

  hide() {
    // 1. Remove overlay from DOM
    // 2. Restore original zoom state
    // 3. Remove event listeners
    // 4. Clear state
  }

  buildContent(translation) {
    // Build DOM structure for translation content
    // See "Content Structure" section below
  }

  calculatePosition(bubbleBounds, overlayWidth, overlayHeight) {
    // Calculate optimal position based on viewport and bubble location
    // See "Positioning Logic" section below
  }

  shouldZoomOut(bubbleBounds, overlayWidth, overlayHeight) {
    // Determine if zoom-out is needed
    // Check available space around bubble and navigation
  }
}
```

**Content Structure:**

```html
<div class="translation-overlay" id="translation-overlay">
  <div class="translation-content">
    <!-- For each sentence -->
    <div class="sentence-block">
      <div class="sentence-text">
        <span class="chinese">中文句子</span>
        <span class="english">English translation</span>
      </div>

      <!-- Vocabulary for this sentence -->
      <div class="vocabulary-section">
        <h3>Vocabulary</h3>
        <ul class="vocabulary-list">
          <li>
            <span class="vocab-word">词</span>
            <span class="vocab-translation">translation</span>
            <span class="vocab-romanization">(pinyin)</span>
          </li>
          <!-- More vocab items... -->
        </ul>
      </div>

      <!-- Grammar notes (if present) -->
      <div class="grammar-section">
        <h3>Grammar</h3>
        <div class="grammar-point">
          <div class="grammar-pattern">Pattern</div>
          <div class="grammar-explanation">Explanation</div>
          <div class="grammar-example">Example</div>
        </div>
        <!-- More grammar points... -->
      </div>
    </div>
    <!-- More sentence blocks... -->

    <!-- Full translation at the end -->
    <div class="full-translation">
      <h3>Full Translation</h3>
      <p>Complete English translation of the entire text bubble.</p>
    </div>
  </div>
</div>
```

---

### 4. Positioning Logic

**Viewport Size Detection:**

Define breakpoints:
- **Mobile Portrait:** `max-width: 768px AND portrait orientation`
- **Mobile Landscape:** `max-width: 768px AND landscape orientation`
- **Tablet/Desktop:** `min-width: 769px`

**Overlay Width (static per viewport):**
- Mobile Portrait: `calc(100vw - 40px)` (20px padding each side)
- Mobile Landscape: `400px`
- Tablet/Desktop: `480px`

**Position Calculation:**

1. **Mobile Portrait:**
   - Width: Full width with padding
   - Position: Above or below bubble
   - Decision logic:
     - Calculate available space above and below bubble
     - If bubble is in top 50% of viewport → position below
     - If bubble is in bottom 50% → position above
     - Ensure minimum 20px spacing from bubble
     - Ensure doesn't overlap with navigation footer (fixed bottom)

2. **Mobile Landscape & Tablet/Desktop:**
   - Width: Static (400px or 480px)
   - Position: Left or right side
   - Decision logic:
     - Calculate bubble center X position
     - If bubble center < 50% of viewport width → position on RIGHT
     - If bubble center >= 50% → position on LEFT
     - Vertical: Align top with bubble, but constrain to viewport
     - Ensure minimum 20px spacing from bubble
     - Ensure doesn't overlap navigation or back button

**Constraints:**
- Overlay must fit within viewport (use max-height and scroll)
- Minimum 20px padding from all viewport edges
- Navigation footer occupies ~60px at bottom
- Back button occupies ~50px at top-left

---

### 5. Zoom-Out Logic

**When to zoom out:**
Only when overlay + bubble + margins won't fit in current viewport

**Zoom calculation:**
1. Calculate required space:
   - Bubble bounding box
   - Overlay dimensions (width is static, height from content)
   - Spacing between bubble and overlay (20px minimum)
   - Margins to viewport edges (20px)
   - Navigation footer space (60px)

2. Calculate zoom factor:
   ```
   requiredSpace = bubbleWidth + overlayWidth + spacing + margins
   currentAvailableSpace = viewportWidth (or height for vertical)

   if (requiredSpace > currentAvailableSpace * currentZoom) {
     newZoom = (currentAvailableSpace / requiredSpace) * 0.95 // 5% safety margin
   }
   ```

3. Apply zoom using same mechanism as panel-navigator.js:
   - Update image scale
   - Update image translate to keep bubble + overlay centered/visible
   - Use CSS transitions for smooth animation

**Zoom restoration:**
- Store original zoom state when overlay opens
- Restore on overlay dismiss (unless navigated to new page/panel)

---

### 6. Dismissal Handling

**Dismiss triggers:**

1. **Click/tap anywhere:**
   - Add click listener to overlay backdrop (full-viewport element behind overlay)
   - Clicking the overlay itself also dismisses (don't stop propagation)
   - Use `capture: true` to ensure we catch all clicks

2. **Navigation events:**
   - Listen for panel navigation (forward/back buttons clicked)
   - Hook into PanelNavigator's navigate methods
   - On page change (view transition start), dismiss overlay

3. **Escape key:**
   - Bonus: Add keyboard shortcut to dismiss

**Implementation:**
```javascript
// In show():
this.dismissHandler = (e) => {
  if (this.isVisible) {
    this.hide();
  }
};

document.addEventListener('click', this.dismissHandler, { capture: true });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && this.isVisible) {
    this.hide();
  }
});

// Hook into navigation
this.navigator.onNavigate(() => {
  if (this.isVisible) {
    this.hide();
  }
});
```

---

### 7. Styling (translation-overlay.css)

**Overlay Container:**
```css
.translation-overlay {
  position: fixed;
  /* Position set dynamically via JS: top, left, right, bottom */
  width: /* Set dynamically based on viewport */;
  max-height: calc(100vh - 120px); /* Account for nav */

  background: white;
  border: 2px solid #333;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

  overflow-y: auto;
  overflow-x: hidden;

  z-index: 1000; /* Above image and bubbles, below navigation */

  /* Smooth entrance */
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 0.2s, transform 0.2s;
}

.translation-overlay.visible {
  opacity: 1;
  transform: scale(1);
}
```

**Content Sections:**
```css
.translation-content {
  padding: 20px;
  font-family: system-ui, -apple-system, sans-serif;
}

.sentence-block {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e0e0e0;
}

.sentence-block:last-of-type {
  border-bottom: 2px solid #333; /* Stronger separator before full translation */
}

.sentence-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.sentence-text .chinese {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.sentence-text .english {
  font-size: 16px;
  color: #444;
  font-style: italic;
}

/* Vocabulary */
.vocabulary-section h3,
.grammar-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  margin: 12px 0 8px 0;
}

.vocabulary-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.vocabulary-list li {
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 6px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: baseline;
}

.vocab-word {
  font-weight: 600;
  color: #1a1a1a;
}

.vocab-translation {
  color: #444;
}

.vocab-romanization {
  color: #666;
  font-size: 14px;
  font-style: italic;
}

/* Grammar */
.grammar-point {
  background: #f9f9f9;
  border-left: 3px solid #4a90e2;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 4px;
}

.grammar-pattern {
  font-weight: 600;
  color: #4a90e2;
  margin-bottom: 4px;
}

.grammar-explanation {
  color: #444;
  margin-bottom: 4px;
  font-size: 14px;
}

.grammar-example {
  color: #666;
  font-style: italic;
  font-size: 14px;
}

/* Full Translation */
.full-translation {
  margin-top: 24px;
  padding: 16px;
  background: #f0f8ff;
  border-radius: 8px;
}

.full-translation h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #1a1a1a;
}

.full-translation p {
  margin: 0;
  color: #444;
  line-height: 1.6;
}

/* Mobile Portrait Specific */
@media (max-width: 768px) and (orientation: portrait) {
  .translation-content {
    padding: 16px;
  }

  .sentence-text .chinese {
    font-size: 16px;
  }

  .sentence-text .english {
    font-size: 14px;
  }
}

/* Scrollbar styling (optional) */
.translation-overlay::-webkit-scrollbar {
  width: 8px;
}

.translation-overlay::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.translation-overlay::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.translation-overlay::-webkit-scrollbar-thumb:hover {
  background: #555;
}
```

---

### 8. Integration Steps

**8.1. Update Page Generator**

Modify `generator/generate-pages.ts`:

1. Add function to load translation JSON:
   ```typescript
   function loadTranslations(pageNumber: number): TranslationResult[] | null {
     const translationPath = `assets/pizarro/page${pageNumber}-translation.json`;
     try {
       return JSON.parse(fs.readFileSync(translationPath, 'utf-8'));
     } catch {
       return null; // Translation doesn't exist yet
     }
   }
   ```

2. Include in page data:
   ```typescript
   const translations = loadTranslations(page);
   const pageData = {
     // ... existing fields
     translations: translations || [],
   };
   ```

3. Add new script tags to generated HTML:
   ```html
   <script src="translation-overlay.js" type="module"></script>
   <script src="bubble-translator.js" type="module"></script>
   ```

**8.2. Modify Panel Navigator**

Add hook for navigation events in `panel-navigator.js`:

```javascript
export class PanelNavigator {
  constructor(...) {
    // ... existing code
    this.navigationCallbacks = [];
  }

  onNavigate(callback) {
    this.navigationCallbacks.push(callback);
  }

  navigate(...) {
    // ... existing navigation logic

    // Trigger callbacks
    this.navigationCallbacks.forEach(cb => cb());
  }
}
```

**8.3. Translation Bubbles Integration**

Create `translation-bubbles.js` that:
1. Imports TranslationOverlayManager
2. Reads translation data from window.COMIC_PAGE_DATA.translations
3. Renders clickable overlays for each translation (using bbox from translation JSON)
4. Handles click events
5. Uses coordinate transformation logic (can reference bubble-debug.js for this)

**8.4. Z-index Stack**

Ensure proper layering:
- Image: z-index 1
- Bubble overlays (debug/clickable): z-index 10
- Translation overlay: z-index 1000
- Navigation footer: z-index 2000
- Back button: z-index 2000

---

## Implementation Order

1. **Phase 1: Data & Basic Overlay** (Core functionality)
   - Update generate-pages.ts to load translations
   - Create translation-overlay.js with basic show/hide
   - Create translation-overlay.css with responsive styles
   - Build content rendering (sentences, vocab, grammar)
   - Test with hardcoded translation data

2. **Phase 2: Clickable Bubbles** (Interaction)
   - Create translation-bubbles.js
   - Render clickable overlays from translation JSON data
   - Add click handlers
   - Test clicking shows overlay with correct data

3. **Phase 3: Positioning** (Smart layout)
   - Implement viewport detection
   - Add positioning logic (above/below, left/right)
   - Test on different screen sizes
   - Ensure doesn't cover bubble or navigation

4. **Phase 4: Zoom Integration** (Optional space management)
   - Add PanelNavigator hook
   - Implement zoom-out calculation
   - Test zoom-out and restoration
   - Handle edge cases (already in panel view, etc.)

5. **Phase 5: Dismissal** (Polish)
   - Add click-to-dismiss
   - Integrate with navigation events
   - Add escape key handler
   - Test all dismissal scenarios

6. **Phase 6: Testing & Polish**
   - Test on mobile (portrait and landscape)
   - Test on tablet and desktop
   - Test with/without translations
   - Test during panel navigation
   - Adjust styling and animations
   - Handle edge cases

---

## Edge Cases & Considerations

1. **Pages without translations:**
   - translation-bubbles.js should handle empty translations array gracefully
   - No clickable overlays rendered if translations array is empty/missing

2. **Multiple bubbles overlapping:**
   - Only show one translation at a time
   - Clicking a new bubble dismisses current overlay

3. **Viewport resize while overlay open:**
   - Recalculate position
   - Re-evaluate zoom if needed
   - Debounce to avoid jank (150ms, matching existing code)

4. **Very long translation content:**
   - Set max-height on overlay
   - Enable vertical scrolling
   - Consider fade indicator at bottom to show more content

5. **Bubble at edge of viewport:**
   - Fallback positioning (e.g., center of screen)
   - Ensure overlay doesn't go off-screen

6. **No space for overlay even with zoom-out:**
   - Set minimum zoom threshold (e.g., 0.5x)
   - Allow slight overlap with bubble if necessary
   - Prioritize keeping translation readable

7. **Touch vs. mouse interactions:**
   - Click/tap work the same
   - Consider touch-specific UX (e.g., tap outside to dismiss is intuitive)
   - No hover states on touch devices

8. **View transitions during overlay:**
   - Dismiss overlay before view transition
   - Ensure no visual glitches

9. **Keyboard navigation users:**
   - Consider adding tab focus support
   - Ensure ESC key works
   - Trap focus within overlay?

---

## Success Criteria

✅ Clicking a bubble with translation shows overlay with correct content
✅ Overlay shows sentences, vocabulary, grammar, and full translation
✅ Overlay doesn't cover the bubble being translated
✅ Overlay doesn't cover navigation controls
✅ On mobile portrait: full width, above or below bubble
✅ On landscape/desktop: fixed width, on left or right side
✅ Overlay scrolls vertically when content is long
✅ Click/tap anywhere dismisses overlay
✅ Navigation dismisses overlay
✅ Zoom-out happens when needed (with static overlay width)
✅ Zoom restored on dismiss (unless navigated)
✅ Only bubbles with translations in JSON are clickable
✅ Smooth animations and transitions
✅ Responsive on all screen sizes

---

## Files to Create/Modify

**New Files:**
- `reader/scripts/translation-overlay.js` - Overlay manager class
- `reader/scripts/translation-bubbles.js` - Clickable translation overlays (independent system)
- `reader/styles/translation-overlay.css` - Overlay styling

**Modified Files:**
- `generator/generate-pages.ts` - Load and embed translation data
- `reader/scripts/panel-navigator.js` - Add navigation hooks
- `reader/index.html` (template) - Add new script/style references

**Reference Files (no changes, but consult for coordinate transformation logic):**
- `reader/scripts/bubble-debug.js` - Coordinate transformation logic (image space → screen space)
- `reader/styles/reader.css` - Existing z-index and layout
- `translator/src/types.ts` - Translation data structure

---

## Notes

- Translation JSON is the **only** source needed - it contains both bounding boxes and translation content
- The OCR and panel JSON files are debug data that will eventually be removed
- Translation bubbles system is completely independent from bubble-debug.js
- Static overlay width simplifies positioning and zoom calculation
- Opposite-side positioning prevents covering translated bubble
- Zoom-out helps but isn't always required - smart positioning first
- Single overlay at a time keeps UX simple
- Dismiss-on-tap is intuitive for touch interfaces
- Consider adding loading state for translations (future enhancement)
- Could add animation between sentences (future enhancement)
- Could add audio pronunciation (future enhancement)

---

## Questions for Review

None! All clarifying questions were answered:
- ✅ Translation JSON is the only source needed (contains both bbox and translation data)
- ✅ No cross-referencing needed - translation system is independent
- ✅ Position on opposite side from bubble on desktop
- ✅ Use static overlay width, zoom out if necessary
