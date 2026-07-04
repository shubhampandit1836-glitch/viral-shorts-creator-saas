"use client";

import { useState, useCallback } from "react";
import { X, Upload, FileVideo } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Progress } from "@acf/ui";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { getFirebaseDb } from "@/lib/firebase";
import { getUploadUrl, uploadToS3 } from "@/lib/api";
import { saveLocalVideo } from "@/lib/local-video-store";
import { calculateCredits } from "@acf/utils";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

export function UploadModal({ open, onClose }: UploadModalProps) {
  const { user, firebaseUser } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const handleUpload = useCallback(async () => {
    if (!file || !user || !firebaseUser) return;

    setStatus("uploading");
    setError("");

    try {
      const token = await firebaseUser.getIdToken();
      const { uploadURL, videoKey, jobId, videoId } = await getUploadUrl(
        token,
        file.name,
        file.type,
        user.uid
      );

      const duration = 0;
      const creditsUsed = calculateCredits(duration);

      await setDoc(doc(getFirebaseDb(), "videos", videoId), {
        id: videoId,
        userId: user.uid,
        title: title || file.name,
        s3Key: videoKey,
        localFileName: file.name,
        localFilePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
        status: "uploading",
        uploadedAt: serverTimestamp(),
        creditsUsed,
      });

      await setDoc(doc(getFirebaseDb(), "jobs", jobId), {
        id: jobId,
        videoId,
        userId: user.uid,
        status: "uploading",
        currentStep: "uploading",
        progress: 0,
        startedAt: serverTimestamp(),
        logs: [],
      });

      await uploadToS3(uploadURL, file, setProgress);

      await saveLocalVideo(videoId, file, {
        localFileName: file.name,
        localFilePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
      });

      await setDoc(
        doc(getFirebaseDb(), "videos", videoId),
        { status: "uploaded", uploadedAt: serverTimestamp() },
        { merge: true }
      );

      await setDoc(
        doc(getFirebaseDb(), "jobs", jobId),
        { status: "uploaded", currentStep: "uploaded", progress: 5 },
        { merge: true }
      );

      setStatus("done");
      setTimeout(onClose, 1500);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }, [file, user, firebaseUser, title, onClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/20"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative z-10 w-full max-w-md rounded-xl border border-[#E8E6E1] bg-white p-6 shadow-lg"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upload Video</h2>
            <button onClick={onClose} className="text-[#6B6B6B] hover:text-[#1A1A1A]">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-[#6B6B6B]">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My podcast episode"
                className="w-full rounded-lg border border-[#E8E6E1] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/30"
              />
            </div>

            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-[#E8E6E1] p-8 hover:border-[#D97757]/50 hover:bg-[#FAF9F5]">
              {file ? (
                <>
                  <FileVideo className="h-8 w-8 text-[#D97757]" />
                  <span className="text-sm font-medium">{file.name}</span>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-[#6B6B6B]" />
                  <span className="text-sm text-[#6B6B6B]">Drop video or click to browse</span>
                </>
              )}
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>

            {status === "uploading" && <Progress value={progress} />}
            {status === "done" && (
              <p className="text-center text-sm text-emerald-600">Upload complete! Processing started.</p>
            )}
            {error && <p className="text-center text-sm text-red-600">{error}</p>}

            <Button
              variant="accent"
              className="w-full"
              disabled={!file || status === "uploading"}
              onClick={handleUpload}
            >
              {status === "uploading" ? `Uploading ${progress}%` : "Start Upload"}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
