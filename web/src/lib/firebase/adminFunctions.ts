"use client";

import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp } from "@/lib/firebase/client";

const functions = getFunctions(firebaseApp, "us-central1");

export const adminCreditWalletFn = httpsCallable<
  { targetUid: string; amount: number; note?: string },
  { status: string }
>(functions, "adminCreditWallet");

export const adminDebitWalletFn = httpsCallable<
  { targetUid: string; amount: number; note?: string },
  { status: string }
>(functions, "adminDebitWallet");

export const freezeAccountFn = httpsCallable<{ targetUid: string; reason?: string }, { status: string }>(
  functions,
  "freezeAccount"
);

export const reactivateAccountFn = httpsCallable<{ targetUid: string }, { status: string }>(
  functions,
  "reactivateAccount"
);

export const reviewWithdrawalFn = httpsCallable<
  { requestId: string; decision: "approved" | "rejected" },
  { status: string }
>(functions, "reviewWithdrawal");

export const upsertAnnouncementFn = httpsCallable<
  {
    announcementId?: string;
    title: string;
    body: string;
    audience: "all" | "verified_only";
    active: boolean;
    expiresAt?: string;
  },
  { announcementId: string }
>(functions, "upsertAnnouncement");

export const deleteAnnouncementFn = httpsCallable<{ announcementId: string }, { status: string }>(
  functions,
  "deleteAnnouncement"
);

export const updateSettingsFn = httpsCallable<Record<string, unknown>, { status: string }>(
  functions,
  "updateSettings"
);
