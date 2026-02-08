const STORAGE_PREFIX = "comicReader:progress:";

export function saveProgress(album, pageNum) {
  try {
    const key = `${STORAGE_PREFIX}${album}`;
    localStorage.setItem(key, String(pageNum));
  } catch (e) {
    // localStorage unavailable (private mode, disabled, etc.)
  }
}

export function getProgress(album) {
  try {
    const key = `${STORAGE_PREFIX}${album}`;
    const value = localStorage.getItem(key);
    return value ? Number.parseInt(value, 10) : null;
  } catch (e) {
    return null;
  }
}

export function clearProgress(album) {
  try {
    const key = `${STORAGE_PREFIX}${album}`;
    localStorage.removeItem(key);
  } catch (e) {
    // localStorage unavailable
  }
}
