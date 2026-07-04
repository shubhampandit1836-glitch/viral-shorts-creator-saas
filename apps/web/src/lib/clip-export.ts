/** Export a clip segment from a locally cached source video as a downloadable file. */

function pickMimeType(): string {
  const candidates = [
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm";
}

export async function exportLocalClip(
  sourceBlob: Blob,
  start: number,
  end: number,
  title: string
): Promise<void> {
  const url = URL.createObjectURL(sourceBlob);

  try {
    const video = document.createElement("video");
    video.src = url;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Could not load local video"));
    });

    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    const targetW = 1080;
    const targetH = 1920;
    const targetRatio = targetW / targetH;
    const srcRatio = srcW / srcH;

    let sx = 0;
    let sy = 0;
    let sw = srcW;
    let sh = srcH;
    if (srcRatio > targetRatio) {
      sw = srcH * targetRatio;
      sx = (srcW - sw) / 2;
    } else {
      sh = srcW / targetRatio;
      sy = (srcH - sh) / 2;
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    const mimeType = pickMimeType();
    const canvasStream = canvas.captureStream(30);

    // Include audio from source when the browser supports captureStream on video
    const videoWithCapture = video as HTMLVideoElement & {
      captureStream?: (fps?: number) => MediaStream;
    };
    if (videoWithCapture.captureStream) {
      const videoStream = videoWithCapture.captureStream(30);
      videoStream.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
    }

    const recorder = new MediaRecorder(canvasStream, {
      mimeType,
      videoBitsPerSecond: 4_000_000,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };

    const recorded = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      recorder.onerror = () => reject(new Error("Recording failed"));
    });

    video.currentTime = Math.min(start, video.duration - 0.1);
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });

    recorder.start(200);
    await video.play();

    await new Promise<void>((resolve) => {
      const draw = () => {
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);
        if (video.currentTime >= end - 0.05 || video.ended) {
          video.pause();
          resolve();
          return;
        }
        requestAnimationFrame(draw);
      };
      draw();
    });

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);
    recorder.stop();
    const blob = await recorded;

    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const safeName = title.replace(/[^a-z0-9-_]/gi, "_").slice(0, 80) || "clip";
    const a = document.createElement("a");
    const outUrl = URL.createObjectURL(blob);
    a.href = outUrl;
    a.download = `${safeName}.${ext}`;
    a.click();
    URL.revokeObjectURL(outUrl);
  } finally {
    URL.revokeObjectURL(url);
  }
}
