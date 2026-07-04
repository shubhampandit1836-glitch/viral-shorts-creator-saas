const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...rest } = options;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(rest.headers ?? {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "API request failed");
  }
  return res.json();
}

export async function getUploadUrl(
  token: string,
  fileName: string,
  contentType: string,
  userId: string
) {
  return apiFetch<{ uploadURL: string; videoKey: string; jobId: string; videoId: string }>(
    "/upload-url",
    {
      method: "POST",
      token,
      body: JSON.stringify({ fileName, contentType, userId }),
    }
  );
}

export async function getClipDownloadUrl(token: string, clipId: string) {
  return apiFetch<{ downloadURL: string; fileName: string }>(`/clip/${clipId}/download`, {
    method: "POST",
    token,
  });
}

export async function uploadToS3(uploadURL: string, file: File, onProgress?: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadURL);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}

export { apiFetch };
