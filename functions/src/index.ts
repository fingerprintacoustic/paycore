import { initializeApp } from "firebase-admin/app";

// Initialize once, before any module that calls getFirestore()/getAuth() is
// imported below — Node's module cache means this only runs once per
// cold start regardless of how many functions get invoked.
initializeApp();

export { transferFunds } from "./transferFunds";
export { onUserCreated, onUserDeleted } from "./auth";
export { setPin, verifyPin } from "./pin";
export { markPhoneVerified } from "./phoneVerification";
export { lookupRecipient } from "./recipientLookup";
export { start2FAEnrollment, confirm2FAEnrollment, verify2FACode, disable2FA } from "./twoFactor";
export { adminCreditWallet, requestWithdrawal, reviewWithdrawal } from "./deposits_withdrawals";
export { adminDebitWallet, freezeAccount, reactivateAccount } from "./adminAccounts";
export { upsertAnnouncement, deleteAnnouncement, updateSettings } from "./adminContent";
export { onNotificationCreated } from "./pushNotifications";
