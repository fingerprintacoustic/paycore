"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/context/AuthContext";

export interface WalletState {
  balance: number; // integer minor units
  currency: string;
  status: "active" | "frozen";
}

export function useWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setWallet(null);
      setLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(
      doc(db, "wallets", user.uid),
      (snap) => {
        const data = snap.data();
        setWallet(
          data
            ? { balance: data.balance, currency: data.currency, status: data.status }
            : null
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsubscribe;
  }, [user]);

  return { wallet, loading };
}

export function formatMoney(minorUnits: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minorUnits / 100);
}
