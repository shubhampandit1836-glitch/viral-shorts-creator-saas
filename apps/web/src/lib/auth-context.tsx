"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import type { User } from "@acf/types";
import { getFirebaseAuth, getFirebaseDb } from "./firebase";

interface AuthContextValue {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function ensureUserDoc(fbUser: FirebaseUser): Promise<User> {
  const ref = doc(getFirebaseDb(), "users", fbUser.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data() as User;
  }

  const newUser: User = {
    uid: fbUser.uid,
    email: fbUser.email ?? "",
    name: fbUser.displayName ?? fbUser.email?.split("@")[0] ?? "User",
    photoURL: fbUser.photoURL ?? undefined,
    plan: "free",
    credits: 50,
    createdAt: new Date().toISOString(),
  };

  await setDoc(ref, { ...newUser, createdAt: serverTimestamp() });
  return newUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const userData = await ensureUserDoc(fbUser);
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const ref = doc(getFirebaseDb(), "users", firebaseUser.uid);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) setUser(snap.data() as User);
    });
  }, [firebaseUser]);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  };

  const signUp = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    await setDoc(doc(getFirebaseDb(), "users", cred.user.uid), {
      uid: cred.user.uid,
      email,
      name,
      plan: "free",
      credits: 50,
      createdAt: serverTimestamp(),
    });
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(getFirebaseAuth(), provider);
  };

  const logout = async () => {
    await signOut(getFirebaseAuth());
  };

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, signIn, signUp, signInWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
