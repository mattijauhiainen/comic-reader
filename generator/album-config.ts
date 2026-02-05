import fs from "node:fs";

export interface AlbumConfig {
  albumFolder: string; // Subfolder name (e.g., "pizarro")
  albumTitle: string; // Display title (e.g., "Tintin and the Picaros")
  totalPages: number; // Number of pages in the album
}

function scanAssets(albumFolder: string): number {
  const assetsDir = `./assets/${albumFolder}`;
  const files = fs.readdirSync(assetsDir);
  const jsonFiles = files.filter((f) => /^page\d+\.json$/.test(f));
  return jsonFiles.length;
}

export function loadAlbumConfigs(): AlbumConfig[] {
  const albumsPath = "./albums.json";
  try {
    const content = fs.readFileSync(albumsPath, "utf-8");
    const albumsData = JSON.parse(content) as Record<string, { title: string }>;
    return Object.entries(albumsData).map(([folder, data]) => {
      const totalPages = scanAssets(folder);
      return {
        albumFolder: folder,
        albumTitle: data.title,
        totalPages,
      };
    });
  } catch (error) {
    console.error(`Failed to load ${albumsPath}:`, error);
    process.exit(1);
  }
}
