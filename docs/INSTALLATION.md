# Installation guide

## Prerequisites

- Node.js 20+
- A Firebase project (free Spark plan works for local development; Blaze
  plan is required to deploy Cloud Functions, since even the free tier of
  Functions requires billing to be enabled)
- The Firebase CLI: `npm install -g firebase-tools`
- Java 17+ (required by the Firestore/Auth emulators — `firebase-tools`
  will tell you if it's missing)

## 1. Create the Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com) and
   create a new project.
2. Enable **Authentication** → Sign-in methods: Email/Password and Phone.
3. Enable **Cloud Firestore** (start in production mode — the rules in
   this repo replace the defaults immediately).
4. Enable **Cloud Storage**.
5. Under **Project settings → Cloud Messaging**, generate a **Web Push
   certificate** (this gives you the VAPID key).
6. Under **Project settings → General**, scroll to "Your apps," add a Web
   app, and copy the config object — you'll need every value from it.
7. Under **Project settings → Service accounts**, generate a new private
   key (a JSON file) — this is your Admin SDK credential. Keep it out of
   version control.

## 2. Clone and install

```bash
git clone <your-repo-url> paycore
cd paycore

cd web && npm install
cd ../functions && npm install
cd ..
```

## 3. Configure environment variables

```bash
cp web/.env.local.example web/.env.local
```

Fill in `web/.env.local`:
- The six `NEXT_PUBLIC_FIREBASE_*` values from step 1.6
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY` from step 1.5
- `FIREBASE_SERVICE_ACCOUNT_KEY` — paste the **entire contents** of the
  service account JSON from step 1.7 as a single-line string

Set your project ID in `.firebaserc`:

```json
{ "projects": { "default": "your-actual-project-id" } }
```

## 4. Run the emulator suite

The emulators let you develop against a local, disposable Firestore/Auth/
Functions/Storage stack — no real data, no cost, no risk of testing
against production.

```bash
firebase emulators:start
```

This opens the Emulator UI at `http://localhost:4000`, where you can
inspect Firestore data, Auth users, and function logs in real time.

## 5. Run the web app

In a separate terminal:

```bash
cd web
npm run dev
```

Visit `http://localhost:3000`. The app will connect to your **real**
Firebase project's Auth/Firestore by default unless you additionally point
the client SDK at the emulators — for most local development, running
against a real (free-tier) Firebase project is simpler than wiring up
emulator connection strings in the client. If you want fully offline
development, add the emulator connection calls
(`connectFirestoreEmulator`, `connectAuthEmulator`, `connectFunctionsEmulator`)
to `src/lib/firebase/client.ts`, gated behind `NODE_ENV === "development"`.

## 6. Bootstrap your first admin

There is no in-app way to become an admin — that's deliberate (see
`scripts/grantAdminRole.ts`). Register a normal account through the app
first, find its `uid` in the Firebase console under Authentication, then:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
  npx ts-node scripts/grantAdminRole.ts <uid> admin
```

Sign out and back in, then visit `/admin`.

## Troubleshooting

- **"FIREBASE_SERVICE_ACCOUNT_KEY is not set"** — this error comes from
  `src/lib/firebase/admin.ts`. Check `.env.local` has the full JSON on one
  line, properly quoted.
- **Phone auth OTP never arrives** — Firebase requires the phone
  auth reCAPTCHA to run against an authorized domain; `localhost` is
  authorized by default, but check Authentication → Settings →
  Authorized domains if you're testing from a different host.
- **Callable functions return `unauthenticated`** — make sure App Check
  is configured (or temporarily set `enforceAppCheck: false` in the
  function definitions while developing locally).
