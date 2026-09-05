import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAuUef0LDaLXcKhzuKkHeVh9ak_h8jnrME",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "orb638.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "orb638",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "orb638.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "591349722937",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:591349722937:web:363a76285bf80c3f9002e8"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

