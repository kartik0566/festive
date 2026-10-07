import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export const isFirebaseAdminConfigured = () =>
  Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);

export const getFirebaseAdminAuth = () => {
  if (!isFirebaseAdminConfigured()) {
    const error = new Error("Firebase sign-in is not configured on this deployment.");
    error.code = "FIREBASE_NOT_CONFIGURED";
    throw error;
  }

  const app =
    getApps()[0] ||
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      })
    });

  return getAuth(app);
};
