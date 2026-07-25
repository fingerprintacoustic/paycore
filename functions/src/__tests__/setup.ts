// Run against the Firestore emulator, never a real project — these tests
// create/delete data freely and must not be pointable at production by
// a missing env var. FIRESTORE_EMULATOR_HOST is what the Admin SDK checks
// to skip real credentials and talk to the emulator instead.
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
process.env.GCLOUD_PROJECT = "demo-paycore";
