"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { Clip } from "@acf/types";

export function useUserClips(userId: string | undefined) {
  const [clipsByVideo, setClipsByVideo] = useState<Record<string, Clip[]>>({});

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(getFirebaseDb(), "clips"),
      where("userId", "==", userId)
    );

    return onSnapshot(q, (snap) => {
      const map: Record<string, Clip[]> = {};
      snap.docs.forEach((d) => {
        const clip = { ...d.data(), id: d.id } as Clip;
        if (!map[clip.videoId]) map[clip.videoId] = [];
        map[clip.videoId].push(clip);
      });
      for (const videoId of Object.keys(map)) {
        map[videoId].sort((a, b) => b.score.overall - a.score.overall);
      }
      setClipsByVideo(map);
    });
  }, [userId]);

  return clipsByVideo;
}
