import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyAxRsJwYHIV3rVqJgjGf_ZwqmMF3TGwooM",
  authDomain: "jkssbdriversacd.firebaseapp.com",
  projectId: "jkssbdriversacd",
  storageBucket: "jkssbdriversacd.firebasestorage.app",
  messagingSenderId: "723957920242",
  appId: "1:723957920242:web:825bc69a22161871107b6b",
  measurementId: "G-TN6YTZCPH1"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'asia-south1');

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('[FIREBASE] Failed to set persistence:', error);
});
