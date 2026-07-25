"use client";

import { useEffect, useState } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { firebaseApp, db } from "@/lib/firebase/client";
import { useAuth } from "@/context/AuthContext";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export type PushPermissionState = "unsupported" | "default" | "granted" | "denied";

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<PushPermissionState>("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PushPermissionState);
  }, []);

  async function enablePush() {
    if (!user) return;

    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== "granted") return;

    // Pass the public Firebase config as query params so the service
    // worker — which can't read process.env — can initialize itself.
    const params = new URLSearchParams(firebaseConfig as Record<string, string>);
    const registration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${params.toString()}`
    );

    const messaging = getMessaging(firebaseApp);
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      // A user may have several devices/browsers — store tokens as a set
      // rather than overwriting, so notifications reach all of them.
      await updateDoc(doc(db, "users", user.uid), { fcmTokens: arrayUnion(token) });
    }

    // Foreground messages (app open, tab focused) don't trigger the
    // service worker's background handler — show them ourselves.
    onMessage(messaging, (payload) => {
      new Notification(payload.notification?.title ?? "PayCore", {
        body: payload.notification?.body,
      });
    });
  }

  return { permission, enablePush };
}
