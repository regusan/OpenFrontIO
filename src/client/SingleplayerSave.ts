import { GameStartInfo, Turn } from "../core/Schemas";

const DB_NAME = "openfront-singleplayer";
const DB_VERSION = 1;
const STORE_NAME = "saves";
const SAVE_KEY = "autosave";

export interface SingleplayerSave {
  version: 1;
  savedAt: number;
  startedAt: number;
  gameStartInfo: GameStartInfo;
  turns: Turn[];
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSingleplayerGame(
  save: SingleplayerSave,
): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(save, SAVE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadSingleplayerGame(): Promise<SingleplayerSave | null> {
  const db = await openDatabase();
  try {
    return await new Promise<SingleplayerSave | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(SAVE_KEY);
      request.onsuccess = () =>
        resolve((request.result as SingleplayerSave | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function deleteSingleplayerGame(): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(SAVE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
