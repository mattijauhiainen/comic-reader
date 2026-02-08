import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { AlbumConfig } from "./album-config";
import { loadAlbumConfigs } from "./album-config";

interface PageInfo {
  pageNum: number;
  imagePath: string;
  hasPrev: boolean;
  hasNext: boolean;
  totalPages: number;
  albumTitle: string;
}

interface PanelData {
  imagePath: string;
  dimensions: {
    width: number;
    height: number;
  };
  panels: Array<{
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  metadata?: {
    extractedAt: string;
  };
}

interface BubbleDetection {
  label: string;
  label_id: number;
  confidence: number;
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  ocr_result?: {
    text_lines: Array<{
      text: string;
      confidence: number;
    }>;
    full_text: string;
    avg_confidence: number;
    error?: string;
  };
}

interface BubbleData {
  image_info: {
    path: string;
    width: number;
    height: number;
  };
  detections: BubbleDetection[];
  model: string;
  threshold: number;
}

interface OcrData {
  image_info: {
    path: string;
    width: number;
    height: number;
  };
  detections: BubbleDetection[];
  ocr_config: {
    lang: string;
    model: string;
    version: string;
    confidence_threshold: number;
  };
  source_bubble_file: string;
  processed_at: string;
}

interface TranslationResult {
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  original_text: string;
  translation_result: {
    chinese_text: string;
    translation: string;
    sentences: Array<{
      chinese_text: string;
      english_translation: string;
      vocabulary: Array<{
        word: string;
        translation: string;
        romanization: string;
      }>;
      grammar_points?: Array<{
        pattern: string;
        explanation: string;
        example: string;
      }>;
    }>;
  };
  api_metadata: {
    model: string;
    tokens_used: number;
  };
}

interface TranslationData {
  metadata: {
    source_ocr_file: string;
    processed_at: string;
    total_bubbles: number;
    translated_bubbles: number;
    skipped_bubbles: number;
    total_tokens: number;
  };
  translations: TranslationResult[];
}

interface CacheManifest {
  shared: {
    version: string;
    files: string[];
  };
  albums: {
    [key: string]: {
      version: string;
      title: string;
      totalPages: number;
      files: string[];
    };
  };
}

function readPanelData(albumFolder: string, pageNum: number): PanelData | null {
  const panelPath = `./assets/${albumFolder}/page${pageNum}.json`;
  try {
    const content = fs.readFileSync(panelPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Could not read panel data: ${panelPath}`);
    return null;
  }
}

function readBubbleData(
  albumFolder: string,
  pageNum: number,
): BubbleDetection[] {
  const bubblePath = `./assets/${albumFolder}/page${pageNum}-bubbles.json`;
  try {
    const content = fs.readFileSync(bubblePath, "utf-8");
    const data: BubbleData = JSON.parse(content);
    // Filter for text_bubble (label_id: 1) and text_free (label_id: 2)
    return data.detections.filter(
      (detection) => detection.label_id === 1 || detection.label_id === 2,
    );
  } catch (error) {
    console.warn(`Could not read bubble data: ${bubblePath}`);
    return [];
  }
}

function readOcrData(
  albumFolder: string,
  pageNum: number,
): Map<string, BubbleDetection> {
  const ocrPath = `./assets/${albumFolder}/page${pageNum}-ocr.json`;
  const ocrMap = new Map<string, BubbleDetection>();

  try {
    const content = fs.readFileSync(ocrPath, "utf-8");
    const data: OcrData = JSON.parse(content);

    // Create a map keyed by bbox coordinates for easy lookup
    for (const detection of data.detections) {
      const key = `${detection.bbox.x1},${detection.bbox.y1},${detection.bbox.x2},${detection.bbox.y2}`;
      ocrMap.set(key, detection);
    }
  } catch (error) {
    console.warn(`Could not read OCR data: ${ocrPath}`);
  }

  return ocrMap;
}

function readTranslationData(
  albumFolder: string,
  pageNum: number,
): TranslationResult[] {
  const translationPath = `./assets/${albumFolder}/page${pageNum}-translation.json`;
  try {
    const content = fs.readFileSync(translationPath, "utf-8");
    const data: TranslationData = JSON.parse(content);
    return data.translations || [];
  } catch (error) {
    console.warn(`No translation data for ${albumFolder} page ${pageNum}`);
    return [];
  }
}

function mergeBubbleWithOcr(
  bubbles: BubbleDetection[],
  ocrMap: Map<string, BubbleDetection>,
): BubbleDetection[] {
  return bubbles.map((bubble) => {
    const key = `${bubble.bbox.x1},${bubble.bbox.y1},${bubble.bbox.x2},${bubble.bbox.y2}`;
    const ocrData = ocrMap.get(key);

    if (ocrData?.ocr_result) {
      return {
        ...bubble,
        ocr_result: ocrData.ocr_result,
      };
    }

    return bubble;
  });
}

function generatePageHTML(
  info: PageInfo,
  albumFolder: string,
  pageNum: number,
): string {
  const preloadLink = info.hasNext
    ? `<link rel="preload" href="./page${info.pageNum + 1}.avif" as="image" />`
    : "";

  // Read panel and bubble data
  const panelData = readPanelData(albumFolder, pageNum);
  const bubbleDetections = readBubbleData(albumFolder, pageNum);
  const ocrMap = readOcrData(albumFolder, pageNum);
  const translations = readTranslationData(albumFolder, pageNum);

  // Merge OCR data with bubble detections
  const bubblesWithOcr = mergeBubbleWithOcr(bubbleDetections, ocrMap);

  // Prepare embedded data
  const panels = panelData?.panels || [];
  const dimensions = panelData?.dimensions || { width: 0, height: 0 };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${info.albumTitle} - Page ${info.pageNum}</title>
  <link rel="icon" type="image/svg+xml" href="../favicon.svg">
  <link rel="stylesheet" href="../styles/variables.css">
  <link rel="stylesheet" href="../styles/reader.css">
  <link rel="stylesheet" href="../styles/view-transitions.css">
  <link rel="stylesheet" href="../styles/comic-nav-menu.css">
  <link rel="stylesheet" href="../styles/translation-overlay.css">
  ${preloadLink}

  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  </script>
  <script>
    // Embed page metadata for panel navigator
    window.COMIC_PAGE_DATA = {
      pageNum: ${info.pageNum},
      totalPages: ${info.totalPages},
      album: "${albumFolder}",
      imagePath: "${info.imagePath}",
      dimensions: ${JSON.stringify(dimensions)},
      panels: ${JSON.stringify(panels)},
      bubbles: ${JSON.stringify(bubblesWithOcr)},
      translations: ${JSON.stringify(translations)}
    };
  </script>
  <script src="../scripts/navigation-state.js"></script>
  <script type="module" src="../scripts/comic-nav-menu.js"></script>
  <script type="module" src="../scripts/panel-navigator.js"></script>
  <script type="module" src="../scripts/translation-overlay.js"></script>
  <script type="module" src="../scripts/translation-bubbles.js"></script>
</head>
<body class="comic-page">
  <main class="viewport">
    <img id="pageImage" src="${info.imagePath}" alt="Page ${info.pageNum}">
    <div class="translation-bubbles-overlay" id="translationBubblesOverlay"></div>
  </main>

  <comic-nav-menu
    current-page="${info.pageNum}"
    total-pages="${info.totalPages}"
    can-go-back="false"
    no-transition>
  </comic-nav-menu>
</body>
</html>
`;
}

function copyAssets(albumFolder: string): void {
  const sourceDir = `./assets/${albumFolder}`;
  const destDir = `./reader/${albumFolder}`;

  console.log(`Copying assets from ${sourceDir} to ${destDir}...`);

  const files = fs.readdirSync(sourceDir);
  let copiedCount = 0;

  for (const file of files) {
    if (file.endsWith(".json")) {
      continue;
    }

    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);
    fs.copyFileSync(sourcePath, destPath);
    copiedCount++;
  }

  console.log(`✓ Copied ${copiedCount} files`);
}

function computeFilesHash(filePaths: string[]): string {
  const hash = crypto.createHash("md5");
  for (const filePath of filePaths.sort()) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      hash.update(filePath);
      hash.update(content);
    }
  }
  return hash.digest("hex").slice(0, 12);
}

function generateManifest(configs: AlbumConfig[]): CacheManifest {
  const sharedFiles = [
    "cache-manifest.json",
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
    "scripts/spacing-utils.js",
    "scripts/translation-overlay.js",
    "scripts/translation-bubbles.js",
    "scripts/offline-manager.js",
    "scripts/offline-ui.js",
    "scripts/reading-progress.js",
    "scripts/reading-progress-ui.js",
  ];

  // Compute hash for shared files
  const sharedHash = computeFilesHash(sharedFiles.map((f) => `reader/${f}`));

  // Build albums object with all albums
  const albums: CacheManifest["albums"] = {};

  for (const config of configs) {
    const albumFiles = [
      // All HTML pages
      ...Array.from(
        { length: config.totalPages },
        (_, i) => `${config.albumFolder}/page${i + 1}.html`,
      ),
      // All images
      ...Array.from(
        { length: config.totalPages },
        (_, i) => `${config.albumFolder}/page${i + 1}.avif`,
      ),
    ];

    // Compute hash for this album's files
    const albumHash = computeFilesHash(albumFiles.map((f) => `reader/${f}`));

    albums[config.albumFolder] = {
      version: albumHash,
      title: config.albumTitle,
      totalPages: config.totalPages,
      files: albumFiles,
    };
  }

  const manifest: CacheManifest = {
    shared: {
      version: sharedHash,
      files: sharedFiles,
    },
    albums,
  };

  return manifest;
}

function generateIndexHTML(configs: AlbumConfig[]): string {
  const albumCards = configs
    .map(
      (
        config,
      ) => `      <div class="album-card" data-album="${config.albumFolder}">
        <a href="${config.albumFolder}/page1.html">
          <h2>${config.albumTitle}</h2>
          <p>${config.totalPages} pages</p>
        </a>
        <div class="album-card__offline" data-album="${config.albumFolder}">
          <button class="download-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Download for Offline</span>
          </button>
          <span class="offline-badge">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Available Offline</span>
          </span>
          <div class="download-progress">
            <div class="download-progress__bar">
              <div class="download-progress__fill"></div>
            </div>
            <span class="download-progress__text">0%</span>
          </div>
        </div>
      </div>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comic Reader</title>
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <link rel="stylesheet" href="styles/variables.css">
  <link rel="stylesheet" href="styles/reader.css">
  <link rel="stylesheet" href="styles/view-transitions.css">
  <link rel="stylesheet" href="styles/offline-ui.css">
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  </script>
</head>
<body>
  <main class="landing">
    <h1>Comic Reader</h1>
    <div class="album-list">
${albumCards}
    </div>
  </main>

  <script type="module" src="scripts/offline-ui.js"></script>
  <script type="module" src="scripts/reading-progress-ui.js"></script>
</body>
</html>
`;
}

function generateAllPages(): void {
  const configs = loadAlbumConfigs();

  console.log(`Found ${configs.length} albums to generate`);

  // Process each album
  for (const config of configs) {
    console.log(
      `\nProcessing "${config.albumTitle}" (${config.totalPages} pages)...`,
    );

    // Ensure output directory exists
    fs.mkdirSync(`reader/${config.albumFolder}`, { recursive: true });

    // Copy assets
    copyAssets(config.albumFolder);

    // Generate pages
    console.log("Generating page HTML files...");
    for (let i = 1; i <= config.totalPages; i++) {
      const html = generatePageHTML(
        {
          pageNum: i,
          imagePath: `./page${i}.avif`,
          hasPrev: i > 1,
          hasNext: i < config.totalPages,
          totalPages: config.totalPages,
          albumTitle: config.albumTitle,
        },
        config.albumFolder,
        i,
      );

      const outputPath = `reader/${config.albumFolder}/page${i}.html`;
      fs.writeFileSync(outputPath, html);
      if (i === 1 || i === config.totalPages || i % 10 === 0) {
        console.log(`  ✓ Generated ${outputPath}`);
      }
    }
    console.log(
      `  ✓ Generated ${config.totalPages} pages for ${config.albumTitle}`,
    );
  }

  console.log("\nGenerating cache manifest...");
  const manifest = generateManifest(configs);
  fs.writeFileSync(
    "reader/cache-manifest.json",
    JSON.stringify(manifest, null, 2),
  );
  console.log("✓ Generated reader/cache-manifest.json");

  console.log("Generating index.html...");
  const indexHTML = generateIndexHTML(configs);
  fs.writeFileSync("reader/index.html", indexHTML);
  console.log("✓ Generated reader/index.html");
}

// Run the generator
console.log("=== Static Site Generator ===\n");
generateAllPages();
console.log("\n✓ Build complete!");
