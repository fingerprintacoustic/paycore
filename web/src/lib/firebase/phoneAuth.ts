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

/**
 * A fresh RecaptchaVerifier is created for every send attempt.
 *
 * RecaptchaVerifier is single-use in practice: after a failed send its cached
 * token is invalid or expired, and the SDK will keep re-submitting that dead
 * token on retry, which surfaces as auth/invalid-app-credential. Clearing and
 * re-creating per attempt is the pattern the Firebase docs prescribe
 * ("If signInWithPhoneNumber results in an error, reset the reCAPTCHA").
 */
export async function sendPhoneOtp(
  phoneNumber: string,
  container: HTMLElement
): Promise<ConfirmationResult> {
  const verifier = new RecaptchaVerifier(auth, container, {
    size: "invisible",
  });
  try {
    return await signInWithPhoneNumber(auth, phoneNumber, verifier);
  } catch (error) {
    // Release the rendered widget so the next attempt starts clean.
    verifier.clear();
    throw error;
  }
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
