"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/context/AuthContext";

export interface TransactionRow {
  id: string;
  type: "transfer" | "deposit" | "withdrawal" | "reversal";
  status: string;
  amount: number;
  currency: string;
  note: string | null;
  referenceNumber: string;
  createdAt: Date;
  direction: "in" | "out";
  counterpartyUid: string | null;
}

export function useTransactions(pageSize = 20) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    // Firestore has no native OR query across two different fields, so we
    // run two listeners (sent / received) and merge client-side. Fine at
    // this scale; move to a denormalized `participantUids` array field +
    // single query if a user's transaction volume grows large.
    const sentQuery = query(
      collection(db, "transactions"),
      where("fromUid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );
    const receivedQuery = query(
      collection(db, "transactions"),
      where("toUid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );

    let sent: TransactionRow[] = [];
    let received: TransactionRow[] = [];

    function merge() {
      const combined = [...sent, ...received]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, pageSize);
      setTransactions(combined);
      setLoading(false);
    }

    const unsubSent = onSnapshot(sentQuery, (snap) => {
      sent = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type,
          status: data.status,
          amount: data.amount,
          currency: data.currency,
          note: data.note,
          referenceNumber: data.referenceNumber,
          createdAt: data.createdAt.toDate(),
          direction: "out" as const,
          counterpartyUid: data.toUid,
        };
      });
      merge();
    });

    const unsubReceived = onSnapshot(receivedQuery, (snap) => {
      received = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type,
          status: data.status,
          amount: data.amount,
          currency: data.currency,
          note: data.note,
          referenceNumber: data.referenceNumber,
          createdAt: data.createdAt.toDate(),
          direction: "in" as const,
          counterpartyUid: data.fromUid,
        };
      });
      merge();
    });

    return () => {
      unsubSent();
      unsubReceived();
    };
  }, [user, pageSize]);

  return { transactions, loading };
}
