import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoKey",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "compracerta-zero.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "compracerta-zero",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "compracerta-zero.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:000000000000",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
