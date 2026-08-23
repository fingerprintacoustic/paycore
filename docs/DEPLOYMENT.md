# Deployment guide

## Before your first deploy

1. **Upgrade to the Blaze (pay-as-you-go) plan.** Cloud Functions cannot
   deploy on the free Spark plan, even for functions that stay within the
   free tier's usage limits.
2. **Set up App Check.** Every callable function in this repo is defined
   with `enforceAppCheck: true`. In the Firebase console, go to
   **App Check**, register your web app with **reCAPTCHA Enterprise** (or
   v3), and put the site key in `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY`.
   If you chose Enterprise, also set
   `NEXT_PUBLIC_FIREBASE_APPCHECK_PROVIDER=enterprise` (the web client
   defaults to the v3 provider). Skipping this means every callable function
   will reject all requests.

   For **local development**, reCAPTCHA will not issue tokens for
   `localhost`. Register a debug token instead: run the app once with
   `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN=true` in `web/.env.local`,
   copy the token the SDK prints to the browser console, add it in the
   console under **App Check > Apps > Manage debug tokens**, then set
   `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN` to that token.
3. **Bootstrap your first admin** — see `docs/INSTALLATION.md` step 6.
   Do this against your production project once it's live, using a real
   account you control.

## Option A: Deploy via GitHub Actions (recommended)

This repo ships with `.github/workflows/deploy.yml`, which runs on every
push to `main`.

### One-time setup

1. In your GitHub repo settings → **Secrets and variables → Actions**, add:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
   - `FIREBASE_PROJECT_ID` — your actual Firebase project ID
   - `FIREBASE_SERVICE_ACCOUNT` — the full service account JSON (same one
     from installation step 1.7)

2. **A note if you usually upload files through the GitHub web UI**:
   browser drag-and-drop silently excludes dot-folders like
   `.github/workflows/`. Create `ci.yml` and `deploy.yml` through GitHub's
   "Create new file" flow instead (type the full path, including the
   leading dot), or push via `git` from a local clone.

3. Push to `main`. The workflow builds the web app, builds Cloud
   Functions, deploys Hosting, then deploys Functions + Firestore rules/
   indexes + Storage rules.

## Option B: Deploy manually from your machine

```bash
# Build both
cd functions && npm run build && cd ../web && npm run build && cd ..

# Log in and select your project
firebase login
firebase use --add   # select your project, alias it "default"

# Deploy everything
firebase deploy
```

Or deploy pieces independently:

```bash
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only storage
```

## Deploying just a rules change

Firestore/Storage security rules changes are low-risk to deploy on their
own and don't require rebuilding the app:

```bash
firebase deploy --only firestore:rules
```

## Rolling back

Firebase Hosting keeps prior releases — use the console's **Hosting**
tab to roll back to a previous version instantly. Cloud Functions doesn't
have a one-click rollback; redeploy the previous commit
(`git checkout <previous-sha> -- functions && firebase deploy --only functions`).

## Post-deploy checklist

- [ ] Confirm App Check is enforced (test a callable from an unauthorized origin — it should be rejected)
- [ ] Confirm `firestore.rules` deployed matches the repo (Firebase console → Firestore → Rules)
- [ ] Send yourself a test transfer between two real accounts
- [ ] Confirm a push notification arrives on a device that's opted in
- [ ] Bootstrap and verify admin access works end-to-end
