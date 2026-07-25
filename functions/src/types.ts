// Shared types — import into both functions/ and the Next.js app via a
// workspace package (e.g. packages/shared) in the full monorepo layout.

export type UserRole = "user" | "admin" | "support";
export type UserStatus = "active" | "frozen" | "pending_verification";

export interface UserDoc {
  uid: string;
  email: string;
  phone: string | null;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
  status: UserStatus;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface WalletDoc {
  uid: string;
  balance: number; // integer minor units
  currency: string;
  status: "active" | "frozen";
  version: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export type TransactionType = "transfer" | "deposit" | "withdrawal" | "reversal";
export type TransactionStatus = "pending" | "completed" | "failed" | "reversed";

export interface TransactionDoc {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  fromUid: string | null;
  toUid: string | null;
  amount: number; // integer minor units, always positive
  currency: string;
  note: string | null;
  referenceNumber: string;
  createdAt: FirebaseFirestore.Timestamp;
  completedAt: FirebaseFirestore.Timestamp | null;
  failureReason: string | null;
  initiatedBy: string;
}

export interface TransferFundsRequest {
  requestId: string; // client-generated UUID, used as idempotency key
  toUid: string;
  amount: number; // integer minor units
  note?: string;
}

export interface TransferFundsResponse {
  transactionId: string;
  status: TransactionStatus;
  referenceNumber: string;
  newBalance: number;
}
