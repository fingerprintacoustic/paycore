import * as functionsV1 from "firebase-functions/v1";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const db = getFirestore();

/**
 * Every code path that writes to `notifications/{id}` (transferFunds,
 * adminCreditWallet, freezeAccount, etc.) already creates the in-app
 * notification doc. This trigger is what turns that doc into an actual
 * push — kept as a trigger rather than inline in every function so the
 * "send a push" concern lives in exactly one place.
 */
export const onNotificationCreated = functionsV1.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snap) => {
    const notification = snap.data();
    const userSnap = await db.collection("users").doc(notification.uid).get();
    const user = userSnap.data();
    if (!user) return;

    if (user.notificationPrefs?.push === false) return;

    const tokens: string[] = user.fcmTokens ?? [];
    if (tokens.length === 0) return;

    const response = await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        type: notification.type,
        notificationId: snap.id,
      },
      webpush: {
        fcmOptions: { link: "/dashboard" },
      },
    });

    // Prune tokens that are no longer valid (app uninstalled, permission
    // revoked, etc.) so the token list doesn't grow unbounded with dead
    // entries — and so future sends don't keep paying for failed calls.
    const invalidTokens = response.responses
      .map((r, i) => (r.success ? null : tokens[i]))
      .filter((t): t is string => t !== null);

    if (invalidTokens.length > 0) {
      await db.collection("users").doc(notification.uid).update({
        fcmTokens: FieldValue.arrayRemove(...invalidTokens),
      });
    }
  });
