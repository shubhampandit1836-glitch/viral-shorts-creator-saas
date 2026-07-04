"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

function getFirebaseApp(): FirebaseApp {
  if (app) return app;

  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "demo-key",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "demo.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-project",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "demo.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "0",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "demo-app",
  };

  app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) auth = getAuth(getFirebaseApp());
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) db = getFirestore(getFirebaseApp());
  return db;
}
