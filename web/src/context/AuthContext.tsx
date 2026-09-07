"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function syncSessionCookie(user: User | null) {
  if (!user) {
    await fetch("/api/auth/session", { method: "DELETE" });
    return;
  }
  const idToken = await user.getIdToken();
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Tracks whether this session has ever held a signed-in user, so we can
  // tell a genuine sign-out (user -> null) from the initial "persistence
  // resolved to signed-out" callback. Only the former should DELETE the
  // session cookie — doing it on the initial null races a concurrent
  // sign-in's cookie POST and logs the user straight back out.
  const hadUser = useRef(false);

  useEffect(() => {
    // onIdTokenChanged fires on sign-in, sign-out, and token refresh —
    // keeping the httpOnly session cookie in lockstep with client auth
    // state, including silent token refreshes every hour.
    const unsubscribe = onIdTokenChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        hadUser.current = true;
        await syncSessionCookie(nextUser);
      } else if (hadUser.current) {
        hadUser.current = false;
        await syncSessionCookie(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    async signIn(email, password) {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Write the session cookie before resolving so a caller that navigates
      // to a protected route on the next line doesn't outrun it (the
      // onIdTokenChanged listener also POSTs it, but asynchronously).
      await syncSessionCookie(cred.user);
    },
    async registerWithEmail(email, password) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await syncSessionCookie(cred.user);
      await sendEmailVerification(cred.user);
      // The corresponding users/{uid} and wallets/{uid} docs are created
      // server-side by an onUserCreated Auth trigger (functions/src/auth.ts,
      // stage 3) — never created from the client.
    },
    async resetPassword(email) {
      await sendPasswordResetEmail(auth, email);
    },
    async signOut() {
      await firebaseSignOut(auth);
      // Clear the cookie before resolving, mirroring signIn — so a caller
      // that navigates after signOut() isn't briefly still authorised
      // server-side.
      await syncSessionCookie(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
