import { z } from "zod";
import { GameStartInfoSchema, TurnSchema } from "../core/Schemas";
import { ClientEnv } from "./ClientEnv";

const DB_NAME = "openfront-singleplayer";
const DB_VERSION = 1;
const STORE_NAME = "saves";
const SAVE_KEY = "autosave";

const SingleplayerSaveSchema = z.object({
  version: z.literal(1),
  gitCommit: z.string(),
  savedAt: z.number(),
  startedAt: z.number(),
  gameStartInfo: GameStartInfoSchema,
  turns: TurnSchema.array(),
});

export type SingleplayerSave = z.infer<typeof SingleplayerSaveSchema>;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSingleplayerGame(
  save: Omit<SingleplayerSave, "version" | "gitCommit" | "savedAt">,
): Promise<void> {
  const db = await openDatabase();
  try {
    const value: SingleplayerSave = {
      ...save,
      version: 1,
      gitCommit: ClientEnv.gitCommit(),
      savedAt: Date.now(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value, SAVE_KEY);
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
    const raw = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(SAVE_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (raw === undefined) return null;

    const parsed = SingleplayerSaveSchema.safeParse(raw);
    if (!parsed.success || parsed.data.gitCommit !== ClientEnv.gitCommit()) {
      await deleteSingleplayerGame();
      return null;
    }
    return parsed.data;
  } catch (error) {
    console.warn("Failed to load singleplayer save", error);
    return null;
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
