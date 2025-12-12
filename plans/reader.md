# Reader - Implementation Plan

## Overview
Build a multi-page website where each HTML page displays one comic book page. Navigation between pages uses standard HTML links. A static site generator (using Bun runtime) creates all HTML files.

## Goal
Create a simple multi-page site where each page displays its comic image with basic navigation controls.

## Architecture

**Project Structure:**
```
comics/
├── assets/                 # Source assets (panel extractor output)
│   └── pizarro/            # Album folder (mirrors reader structure)
│       ├── page1.avif
│       ├── page1.json
│       ├── page2.avif
│       ├── page2.json
│       └── ...
├── panelExtractor/         # Panel extraction tool
├── generator/              # Static site generator
│   ├── generate-pages.ts   # Main generator script
│   └── serve.ts            # Development server
└── reader/                 # PUBLIC directory (output, gets served)
    ├── index.html          # Landing page, lists available albums
    ├── pizarro/            # Album folder
    │   ├── index.html      # Album landing page
    │   ├── page1.html      # Comic page 1
    │   ├── page2.html      # Comic page 2
    │   └── ...
    ├── styles/
    │   └── reader.css      # Shared styles
    └── assets/             # Assets copied here during build
        └── pizarro/        # Album assets
            ├── page1.avif
            ├── page1.json
            └── ...
```

**Build Flow:**
1. Configure album in `generator/generate-pages.ts` (albumFolder and albumTitle)
2. Run generator: `bun run generator/generate-pages.ts`
3. Generator reads from `./assets/{albumFolder}/` (source)
4. Generator creates HTML files in `./reader/{albumFolder}/`
5. Generator copies assets to `./reader/assets/{albumFolder}/`
6. `./reader/` directory is ready to serve

Each page is a separate HTML file. Static site generation creates all files. No client-side routing needed.

## Page Structure

Each `pizarro/pageN.html` will have:
```html
<!DOCTYPE html>
<html>
<head>
  <title>Pizarro - Page N</title>
  <link rel="stylesheet" href="../styles/reader.css">
</head>
<body>
  <main class="viewport">
    <img src="../assets/pizarro/pageN.avif" alt="Page N">
  </main>

  <footer>
    <nav>
      <a href="pageN-1.html">← Previous</a>
      <span>Page N / Total</span>
      <a href="pageN+1.html">Next →</a>
    </nav>
    <a href="index.html" class="home-link">Album Home</a>
  </footer>
</body>
</html>
```

## UI Layout
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│          Comic Page Image           │
│          (full page view)           │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ [← Prev]  Page N / Total  [Next →]  │
│          [Album Home]                │
└─────────────────────────────────────┘
```

## Implementation Steps

#### Step 1: Project Setup
- Create `generator/` directory for build scripts
- Create `reader/` directory (public output)
- Create `reader/pizarro/` directory for the album
- Create `reader/styles/` directory
- Set up basic file structure

#### Step 2: Create Landing Pages
- Create `reader/index.html` with list of available albums
- Create `reader/pizarro/index.html` with album info and link to page1.html
- Basic styling

#### Step 3: Create Page Template
- Design the HTML structure for a single page
- Add main viewport for image (full height)
- Include footer with navigation controls and album home link

#### Step 4: Build Static Site Generator
Create `generator/generate-pages.ts` (runs with Bun) that:
- Scans `./assets/pizarro/` folder for available pages
- Reads each `pageN.json` to get metadata
- Generates HTML files in `./reader/pizarro/`
- Copies assets from `./assets/pizarro/` to `./reader/assets/pizarro/`
- Updates navigation links (prev/next)
- Handles edge cases (first page has no prev, last page has no next)
- Generates album index pages

Create `generator/serve.ts` for development server

**Runtime:** Bun

#### Step 5: Style the Reader
Create `reader.css` with:
- Full-height image viewport
- Floating footer (fixed position at bottom)
- Centered image display
- Responsive image sizing (fit to viewport)
- Navigation button styles

#### Step 6: Handle Edge Cases
- First page: disable/hide "Previous" button
- Last page: disable/hide "Next" button
- Missing images: show error state
- Loading states for images

## CSS Considerations

**Image Display:**
```css
body {
  margin: 0;
  padding: 0;
}

.viewport {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding-bottom: 80px; /* Space for floating footer */
}

.viewport img {
  max-width: 100%;
  max-height: 100vh;
  object-fit: contain;
}

footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  padding: 1rem;
  text-align: center;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

footer nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
```

**Responsive Design:**
- Desktop: Large viewport, comfortable navigation
- Mobile: Full-screen image, touch-friendly nav buttons
- Handle both portrait and landscape orientations

## Generator Implementation

**Configuration:**
The generator uses an inline configuration object to support multiple albums:
- `albumFolder`: The subfolder name in `assets/` and `reader/` (e.g., "pizarro")
- `albumTitle`: The human-readable title used in page titles and headings (e.g., "Pizarro")

**Static Generator Script (runs with Bun):**
```typescript
// generator/generate-pages.ts
import fs from 'fs';
import path from 'path';

interface PageInfo {
  pageNum: number;
  imagePath: string;
  hasPrev: boolean;
  hasNext: boolean;
  totalPages: number;
  albumTitle: string;
}

interface AlbumConfig {
  albumFolder: string;  // Subfolder name (e.g., "pizarro")
  albumTitle: string;   // Display title (e.g., "Pizarro")
}

function generatePage(info: PageInfo): string {
  // Return HTML string using template
  // Fill in page number, image path, nav links, album title
}

function scanAssets(albumFolder: string): number {
  // Count how many pageN.json files exist in ./assets/{albumFolder}/
  const files = fs.readdirSync(`./assets/${albumFolder}`);
  return files.filter(f => f.endsWith('.json')).length;
}

function copyAssets(albumFolder: string) {
  // Copy files from ./assets/{albumFolder}/ to ./reader/assets/{albumFolder}/
  const sourceDir = `./assets/${albumFolder}`;
  const destDir = `./reader/assets/${albumFolder}`;
  const files = fs.readdirSync(sourceDir);
  for (const file of files) {
    fs.copyFileSync(
      `${sourceDir}/${file}`,
      `${destDir}/${file}`
    );
  }
}

function generateAllPages() {
  // CONFIGURATION - Edit these values for different albums
  const config: AlbumConfig = {
    albumFolder: "pizarro",  // Subfolder in assets/ and reader/
    albumTitle: "Pizarro",   // Title shown in pages
  };

  const totalPages = scanAssets(config.albumFolder);

  // Ensure output directories exist
  fs.mkdirSync(`reader/${config.albumFolder}`, { recursive: true });
  fs.mkdirSync(`reader/assets/${config.albumFolder}`, { recursive: true });

  // Copy assets
  copyAssets(config.albumFolder);

  // Generate pages
  for (let i = 1; i <= totalPages; i++) {
    const html = generatePage({
      pageNum: i,
      imagePath: `../assets/${config.albumFolder}/page${i}.avif`,
      hasPrev: i > 1,
      hasNext: i < totalPages,
      totalPages,
      albumTitle: config.albumTitle
    });

    fs.writeFileSync(
      `reader/${config.albumFolder}/page${i}.html`,
      html
    );
  }
}
```

**Usage:**
To generate pages for a different album, simply update the configuration object:
```typescript
const config: AlbumConfig = {
  albumFolder: "asterix",
  albumTitle: "Asterix in Britain",
};
```

### Testing Strategy
- Test navigation flow (page 1 → 2 → 3 → ... → N)
- Test edge cases (first page, last page)
- Test on different screen sizes
- Test with different browser zoom levels
- Verify images load correctly
- Check accessibility (alt text, keyboard navigation)

## Build and Development

### Static Site Generator
**Runtime:** Bun

Run the generator:
```bash
bun run generator/generate-pages.ts
```

### Development Server
Create `generator/serve.ts`:
```typescript
// generator/serve.ts
Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    const filepath = "./reader" + (url.pathname === "/" ? "/index.html" : url.pathname);
    return new Response(Bun.file(filepath));
  }
});

console.log("Server running at http://localhost:3000");
```

Run the dev server:
```bash
bun run generator/serve.ts
```

### TypeScript Setup
Bun has built-in TypeScript support, no separate compilation needed.

Optional `tsconfig.json` for editor support:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "types": ["bun-types"]
  }
}
```

### Workflow
1. Run panel extractor to generate assets (if needed)
2. Edit generator script (`generator/generate-pages.ts`) or HTML templates
3. Run `bun run generator/generate-pages.ts` to build site
4. Run `bun run generator/serve.ts` to start dev server
5. Test in browser at http://localhost:3000
6. Iterate

## Summary

**Deliverables:**
- `generator/` directory with build scripts
  - `generate-pages.ts` - Static site generator
  - `serve.ts` - Development server
- `reader/` directory (public, ready to serve)
  - Main landing page (index.html) listing albums
  - Album landing page (pizarro/index.html)
  - Generated page HTML files (pizarro/page1.html, etc.)
  - Shared CSS for styling
  - Assets copied from root

**Tech Stack:**
- Bun runtime for static site generation and dev server
- TypeScript for generator scripts
- Plain HTML/CSS for reader pages
- No frameworks, no client-side routing

**File Organization:**
- `./assets/pizarro/` - Source assets for Pizarro album (panelExtractor output)
- `./generator/` - Build scripts
- `./reader/` - Public output directory (self-contained, ready to deploy)
- `./reader/assets/pizarro/` - Assets copied here during build

**Consistency:**
- Source: `./assets/pizarro/page1.avif`
- Output: `./reader/assets/pizarro/page1.avif`
- Structure mirrors between source and output
