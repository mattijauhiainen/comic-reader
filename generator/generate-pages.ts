import fs from "fs";
import path from "path";

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

interface AlbumConfig {
  albumFolder: string; // Subfolder name (e.g., "pizarro")
  albumTitle: string; // Display title (e.g., "Pizarro")
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
    // Translation file doesn't exist yet - this is normal for pages 2+
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
  <link rel="stylesheet" href="../styles/variables.css">
  <link rel="stylesheet" href="../styles/reader.css">
  <link rel="stylesheet" href="../styles/view-transitions.css">
  <link rel="stylesheet" href="../styles/translation-overlay.css">
  ${preloadLink}

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
  <script src="../scripts/transition-direction.js"></script>
  <script type="module" src="../scripts/panel-navigator.js"></script>
  <script type="module" src="../scripts/translation-overlay.js"></script>
  <script type="module" src="../scripts/translation-bubbles.js"></script>
</head>
<body class="comic-page">
  <main class="viewport">
    <img id="pageImage" src="${info.imagePath}" alt="Page ${info.pageNum}">
    <div class="translation-bubbles-overlay" id="translationBubblesOverlay"></div>
  </main>

  <a href="../index.html" class="back-link">Back to Albums</a>

  <footer>
    <nav>
      <a id="prevBtn">←</a>
      <span id="positionIndicator">${info.pageNum} / ${info.totalPages}</span>
      <a id="nextBtn">→</a>
    </nav>
  </footer>
</body>
</html>
`;
}

function scanAssets(albumFolder: string): number {
  const assetsDir = `./assets/${albumFolder}`;
  const files = fs.readdirSync(assetsDir);
  const jsonFiles = files.filter((f) => /^page\d+\.json$/.test(f));
  return jsonFiles.length;
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

function generateAllPages(): void {
  // CONFIGURATION - Edit these values for different albums
  const config: AlbumConfig = {
    albumFolder: "pizarro", // Subfolder in assets/ and reader/
    albumTitle: "Tintin and the Picaros", // Title shown in pages
  };

  const totalPages = scanAssets(config.albumFolder);

  console.log(
    `Found ${totalPages} pages to generate for "${config.albumTitle}"`,
  );

  // Ensure output directory exists
  fs.mkdirSync(`reader/${config.albumFolder}`, { recursive: true });

  // Copy assets
  copyAssets(config.albumFolder);

  // Generate pages
  console.log("Generating page HTML files...");
  for (let i = 1; i <= totalPages; i++) {
    const html = generatePageHTML(
      {
        pageNum: i,
        imagePath: `./page${i}.avif`,
        hasPrev: i > 1,
        hasNext: i < totalPages,
        totalPages,
        albumTitle: config.albumTitle,
      },
      config.albumFolder,
      i,
    );

    const outputPath = `reader/${config.albumFolder}/page${i}.html`;
    fs.writeFileSync(outputPath, html);
    if (i === 1 || i === totalPages || i % 10 === 0) {
      console.log(`✓ Generated ${outputPath}`);
    }
  }

  console.log(`✓ Generated ${totalPages} pages successfully!`);
}

// Run the generator
console.log("=== Static Site Generator ===\n");
generateAllPages();
console.log("\n✓ Build complete!");
