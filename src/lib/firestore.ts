import { Firestore } from "@google-cloud/firestore";

// Uses Application Default Credentials (gcloud ADC locally, service account on Cloud Run).
const globalForDb = globalThis as unknown as { firestore?: Firestore };

export const db =
  globalForDb.firestore ??
  new Firestore({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    ignoreUndefinedProperties: true,
  });

globalForDb.firestore = db;
