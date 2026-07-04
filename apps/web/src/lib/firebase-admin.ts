import { readFileSync, existsSync } from "fs";
import path from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let initialized = false;

function loadServiceAccount(): Record<string, unknown> {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  const saPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ??
    path.join(process.cwd(), "firestore-service-account.json");
  if (!existsSync(saPath)) {
    throw new Error(`Firebase service account not found at ${saPath}`);
  }
  return JSON.parse(readFileSync(saPath, "utf8"));
}

export function getAdminDb() {
  if (!initialized && !getApps().length) {
    initializeApp({ credential: cert(loadServiceAccount() as Parameters<typeof cert>[0]) });
    initialized = true;
  }
  return getFirestore();
}
