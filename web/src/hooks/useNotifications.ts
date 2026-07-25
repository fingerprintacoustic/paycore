"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/context/AuthContext";

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: Date;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const q = query(
      collection(db, "notifications"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    return onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            type: data.type,
            title: data.title,
            body: data.body,
            read: data.read,
            createdAt: data.createdAt.toDate(),
          };
        })
      );
    });
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markRead(id: string) {
    // Allowed by firestore.rules: clients may flip only the `read` field.
    await updateDoc(doc(db, "notifications", id), { read: true });
  }

  return { notifications, unreadCount, markRead };
}
