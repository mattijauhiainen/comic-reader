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

interface AlbumConfig {
  albumFolder: string; // Subfolder name (e.g., "pizarro")
  albumTitle: string; // Display title (e.g., "Pizarro")
}

function generatePageHTML(info: PageInfo): string {
  const prevLink = info.hasPrev
    ? `<a href="page${info.pageNum - 1}.html">←</a>`
    : '<a class="disabled">←</a>';

  const nextLink = info.hasNext
    ? `<a href="page${info.pageNum + 1}.html">→</a>`
    : '<a class="disabled">→</a>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${info.albumTitle} - Page ${info.pageNum}</title>
  <link rel="stylesheet" href="../styles/reader.css">
</head>
<body>
  <a href="../index.html" class="back-link">Back to Albums</a>

  <main class="viewport">
    <img src="${info.imagePath}" alt="Page ${info.pageNum}">
  </main>

  <footer>
    <nav>
      ${prevLink}
      <span>${info.pageNum} / ${info.totalPages}</span>
      ${nextLink}
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
  const destDir = `./reader/assets/${albumFolder}`;

  console.log(`Copying assets from ${sourceDir} to ${destDir}...`);

  const files = fs.readdirSync(sourceDir);
  let copiedCount = 0;

  for (const file of files) {
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
    albumTitle: "Pizarro", // Title shown in pages
  };

  const totalPages = scanAssets(config.albumFolder);

  console.log(
    `Found ${totalPages} pages to generate for "${config.albumTitle}"`,
  );

  // Ensure output directories exist
  fs.mkdirSync(`reader/${config.albumFolder}`, { recursive: true });
  fs.mkdirSync(`reader/assets/${config.albumFolder}`, { recursive: true });

  // Copy assets
  copyAssets(config.albumFolder);

  // Generate pages
  console.log("Generating page HTML files...");
  for (let i = 1; i <= totalPages; i++) {
    const html = generatePageHTML({
      pageNum: i,
      imagePath: `../assets/${config.albumFolder}/page${i}.avif`,
      hasPrev: i > 1,
      hasNext: i < totalPages,
      totalPages,
      albumTitle: config.albumTitle,
    });

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
