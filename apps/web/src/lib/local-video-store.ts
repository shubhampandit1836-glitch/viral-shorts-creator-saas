const DB_NAME = "acf-local-videos";
const STORE = "videos";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "videoId" });
    };
  });
}

export async function saveLocalVideo(
  videoId: string,
  file: File,
  meta: { localFileName: string; localFilePath?: string }
) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({
      videoId,
      blob: file,
      localFileName: meta.localFileName,
      localFilePath: meta.localFilePath ?? meta.localFileName,
      savedAt: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalVideoUrl(videoId: string): Promise<string | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(videoId);
    req.onsuccess = () => {
      const row = req.result as { blob?: Blob } | undefined;
      if (!row?.blob) {
        resolve(null);
        return;
      }
      resolve(URL.createObjectURL(row.blob));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getLocalVideoMeta(videoId: string) {
  const db = await openDb();
  return new Promise<{ localFileName: string; localFilePath: string } | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(videoId);
    req.onsuccess = () => {
      const row = req.result as { localFileName?: string; localFilePath?: string } | undefined;
      if (!row) {
        resolve(null);
        return;
      }
      resolve({
        localFileName: row.localFileName ?? "Local video",
        localFilePath: row.localFilePath ?? row.localFileName ?? "Local video",
      });
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getLocalVideoBlob(videoId: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(videoId);
    req.onsuccess = () => {
      const row = req.result as { blob?: Blob } | undefined;
      resolve(row?.blob ?? null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteLocalVideo(videoId: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(videoId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
