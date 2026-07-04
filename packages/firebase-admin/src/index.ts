import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore, FieldValue } from "firebase-admin/firestore";

let adminApp: App | undefined;
let adminDb: Firestore | undefined;
let initPromise: Promise<Firestore> | undefined;

async function initAdmin(): Promise<Firestore> {
  if (adminDb) return adminDb;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!getApps().length) {
      const secretArn = process.env.FIREBASE_SECRET_ARN;
      if (secretArn) {
        const client = new SecretsManagerClient({});
        const res = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));
        const sa = JSON.parse(res.SecretString!);
        adminApp = initializeApp({ credential: cert(sa) });
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        adminApp = initializeApp({
          credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
        });
      } else {
        adminApp = initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
      }
    }
    adminDb = getFirestore();
    return adminDb;
  })();

  return initPromise;
}

export async function getAdminDb(): Promise<Firestore> {
  return initAdmin();
}

export async function updateVideoStatus(
  videoId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const db = await getAdminDb();
  await db.collection("videos").doc(videoId).set(
    {
      status,
      ...extra,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function updateJobProgress(
  jobId: string,
  currentStep: string,
  progress: number,
  status?: string,
  extra: Record<string, unknown> = {}
) {
  const db = await getAdminDb();
  await db.collection("jobs").doc(jobId).set(
    {
      currentStep,
      progress,
      ...(status ? { status } : {}),
      ...extra,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function appendJobLog(
  jobId: string,
  step: string,
  message: string,
  progress: number,
  status?: string
) {
  const db = await getAdminDb();
  await db.collection("jobs").doc(jobId).set(
    {
      currentStep: step,
      progress,
      ...(status ? { status } : {}),
      logs: FieldValue.arrayUnion({
        step,
        message,
        timestamp: new Date().toISOString(),
      }),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function saveTranscript(
  videoId: string,
  transcript: { text: string; segments: unknown[]; language?: string }
) {
  const db = await getAdminDb();
  await db.collection("transcripts").doc(videoId).set({
    videoId,
    ...transcript,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function saveClip(videoId: string, clipId: string, clip: Record<string, unknown>) {
  const db = await getAdminDb();
  await db.collection("clips").doc(clipId).set({
    videoId,
    ...clip,
    createdAt: FieldValue.serverTimestamp(),
  });
}
