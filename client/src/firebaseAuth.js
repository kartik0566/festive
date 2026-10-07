const readConfig = () => ({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
});

export const isFirebaseConfigured = () => Object.values(readConfig()).every(Boolean);

export const getFirebaseSignInToken = async (providerName) => {
  const config = readConfig();
  if (!Object.values(config).every(Boolean)) {
    throw new Error("Google and Facebook sign-in need Firebase web settings. Add the VITE_FIREBASE values in Render first.");
  }

  const [{ getApp, getApps, initializeApp }, { FacebookAuthProvider, GoogleAuthProvider, getAuth, signInWithPopup }] =
    await Promise.all([import("firebase/app"), import("firebase/auth")]);
  const app = getApps().length ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  const provider = providerName === "google" ? new GoogleAuthProvider() : new FacebookAuthProvider();

  if (providerName === "google") {
    provider.setCustomParameters({ prompt: "select_account" });
  }

  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
};
