"use client";

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithCredential,
  PhoneAuthProvider,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";

let recaptchaVerifier: RecaptchaVerifier | null = null;

/** Must be called after the container element is mounted in the DOM. */
export function getRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
    });
  }
  return recaptchaVerifier;
}

export async function sendPhoneOtp(
  phoneNumber: string,
  containerId: string
): Promise<ConfirmationResult> {
  const verifier = getRecaptchaVerifier(containerId);
  return signInWithPhoneNumber(auth, phoneNumber, verifier);
}

/**
 * Links a verified phone number to the currently signed-in email/password
 * account, rather than creating a second, separate account. This is the
 * "add phone to my existing account" path used right after email
 * registration.
 */
export async function confirmAndLinkPhone(
  confirmation: ConfirmationResult,
  otpCode: string,
  currentUser: User
): Promise<void> {
  const credential = PhoneAuthProvider.credential(confirmation.verificationId, otpCode);
  await linkWithCredential(currentUser, credential);
}
