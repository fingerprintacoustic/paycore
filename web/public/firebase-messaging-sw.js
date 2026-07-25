// This file must be served from the site root (public/firebase-messaging-sw.js
// -> https://yourapp.com/firebase-messaging-sw.js) — FCM requires it there,
// not under /static or any subpath, so it can control the whole origin.
importScripts("https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js");

// Service workers can't read Next.js env vars at build time. Instead, the
// client (see hooks/usePushNotifications.ts) registers this worker with
// the public Firebase config appended as query params, and we read them
// back here. These are the same "public" web config values already
// exposed in the client bundle — safe to pass this way, not secrets.
const params = new URLSearchParams(self.location.search);
firebase.initializeApp({
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  self.registration.showNotification(title ?? "PayCore", {
    body: body ?? "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: payload.data,
  });
});

// Tapping the notification focuses/opens the app instead of just dismissing.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
