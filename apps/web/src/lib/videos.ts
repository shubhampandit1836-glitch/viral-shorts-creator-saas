import { doc, updateDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import { deleteLocalVideo } from "./local-video-store";

const CANCELLABLE = new Set([
  "uploading",
  "uploaded",
  "extracting_audio",
  "transcribing",
  "analyzing",
  "generating_clips",
  "generating_captions",
  "finalizing",
]);

export function canCancelVideo(status: string) {
  return CANCELLABLE.has(status);
}

export async function cancelVideo(videoId: string, jobId?: string) {
  const db = getFirebaseDb();
  const ts = new Date().toISOString();

  await updateDoc(doc(db, "videos", videoId), {
    status: "cancelled",
    cancelledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (jobId) {
    await updateDoc(doc(db, "jobs", jobId), {
      status: "cancelled",
      currentStep: "cancelled",
      progress: 0,
      updatedAt: serverTimestamp(),
      logs: arrayUnion({
        step: "cancelled",
        message: "Cancelled by user",
        timestamp: ts,
      }),
    });
  }

  try {
    await deleteLocalVideo(videoId);
  } catch {
    // IndexedDB cleanup is best-effort
  }
}
