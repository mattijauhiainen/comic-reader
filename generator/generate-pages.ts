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

function readBubbleData(albumFolder: string, pageNum: number): BubbleDetection[] {
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

  // Prepare embedded data
  const panels = panelData?.panels || [];
  const dimensions = panelData?.dimensions || { width: 0, height: 0 };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${info.albumTitle} - Page ${info.pageNum}</title>
  <link rel="stylesheet" href="../styles/reader.css">
  <link rel="stylesheet" href="../styles/transitions.css">
  <link rel="stylesheet" href="../styles/bubble-debug.css">
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
      bubbles: ${JSON.stringify(bubbleDetections)}
    };
  </script>
  <script src="../scripts/transition-direction.js"></script>
  <script type="module" src="../scripts/panel-navigator.js"></script>
  <script type="module" src="../scripts/bubble-debug.js"></script>
</head>
<body class="comic-page">
  <a href="../index.html" class="back-link">Back to Albums</a>

  <main class="viewport">
    <img id="pageImage" src="${info.imagePath}" alt="Page ${info.pageNum}">
    <div class="bubble-overlay" id="bubbleOverlay"></div>
  </main>

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
  const jsonFiles = files.filter((f) => f.endsWith(".json"));
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
