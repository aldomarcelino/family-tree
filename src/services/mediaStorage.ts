import type { FolderDirectoryHandle } from "@/src/types/family";

const DB_NAME = "FamilyTreeMedia";
const STORE_NAME = "images";
const urlCache = new Map<string, string>();

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment."));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveImageToIndexedDB = async (id: string, file: Blob): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(file, id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const getImageFromIndexedDB = async (id: string): Promise<Blob | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
};

const deleteImageFromIndexedDB = async (id: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Ignore errors
  }
};

const saveImageToDirectory = async (
  dirHandle: FolderDirectoryHandle,
  fileName: string,
  file: Blob,
): Promise<void> => {
  const imagesFolder = await dirHandle.getDirectoryHandle("images", { create: true });
  const fileHandle = await imagesFolder.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(file);
  await writable.close();
};

const getImageFromDirectory = async (
  dirHandle: FolderDirectoryHandle,
  fileName: string,
): Promise<Blob | null> => {
  try {
    const imagesFolder = await dirHandle.getDirectoryHandle("images");
    const fileHandle = await imagesFolder.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return file;
  } catch {
    return null;
  }
};

const deleteImageFromDirectory = async (
  dirHandle: FolderDirectoryHandle,
  fileName: string,
): Promise<void> => {
  try {
    const imagesFolder = await dirHandle.getDirectoryHandle("images");
    await imagesFolder.removeEntry(fileName);
  } catch {
    // Ignore errors
  }
};

/**
 * Saves an image to local media storage. If a directory handle is provided, 
 * saves inside images/ folder. Otherwise, fallbacks to IndexedDB.
 */
export const addImage = async (
  id: string,
  file: Blob,
  dirHandle?: FolderDirectoryHandle,
): Promise<string> => {
  // Clear from cache first
  if (urlCache.has(id)) {
    URL.revokeObjectURL(urlCache.get(id)!);
    urlCache.delete(id);
  }

  if (dirHandle) {
    await saveImageToDirectory(dirHandle, id, file);
  } else {
    await saveImageToIndexedDB(id, file);
  }

  return id;
};

/**
 * Removes an image from media storage.
 */
export const removeImage = async (id: string, dirHandle?: FolderDirectoryHandle): Promise<void> => {
  if (urlCache.has(id)) {
    URL.revokeObjectURL(urlCache.get(id)!);
    urlCache.delete(id);
  }

  if (dirHandle) {
    await deleteImageFromDirectory(dirHandle, id);
  } else {
    await deleteImageFromIndexedDB(id);
  }
};

/**
 * Fetches an image URL from media storage without base64 conversion.
 */
export const getImageURL = async (
  id: string,
  dirHandle?: FolderDirectoryHandle,
): Promise<string | null> => {
  if (!id) return null;

  if (urlCache.has(id)) {
    return urlCache.get(id)!;
  }

  let blob: Blob | null = null;
  if (dirHandle) {
    blob = await getImageFromDirectory(dirHandle, id);
  }

  if (!blob) {
    blob = await getImageFromIndexedDB(id);
  }

  if (blob) {
    const url = URL.createObjectURL(blob);
    urlCache.set(id, url);
    return url;
  }

  return null;
};
