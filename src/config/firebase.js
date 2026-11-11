import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Expo replaces these EXPO_PUBLIC_* references at bundle time. Firebase's web
// configuration identifies the project; authorization is enforced by Auth and
// Firestore Security Rules, never by keeping this client config secret.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

const configLabels = {
  apiKey: 'EXPO_PUBLIC_FIREBASE_API_KEY',
  authDomain: 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  projectId: 'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  storageBucket: 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'EXPO_PUBLIC_FIREBASE_APP_ID',
};

const isPlaceholder = (value) =>
  !value || /^(your-|YOUR_|tu-proyecto|\.\.\.)/i.test(value.trim());

export const getMissingFirebaseConfig = () =>
  Object.entries(firebaseConfig)
    .filter(([, value]) => isPlaceholder(value))
    .map(([key]) => configLabels[key]);

export const isFirebaseConfigured = () => getMissingFirebaseConfig().length === 0;

let app;
let db;
let auth;

export const initFirebase = () => {
  const missing = getMissingFirebaseConfig();
  if (missing.length) {
    throw new Error(
      `Firebase no está configurado. Completa estas variables en .env: ${missing.join(', ')}`,
    );
  }

  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }

  if (!db) {
    db = getFirestore(app);
  }

  if (!auth) {
    try {
      if (Platform.OS !== 'web' && typeof getReactNativePersistence === 'function') {
        auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } else {
        auth = getAuth(app);
      }
    } catch {
      // Reuse Auth when it was initialized elsewhere during hot reload.
      auth = getAuth(app);
    }
  }

  return { app, db, auth };
};

// Avoid creating a Firebase app with sample IDs. App.js shows setup guidance
// until the real Firebase web app configuration is available.
if (isFirebaseConfigured()) {
  initFirebase();
}

export const getDb = () => {
  if (!db) initFirebase();
  return db;
};

export const getFirebaseAuth = () => {
  if (!auth) initFirebase();
  return auth;
};

export const getFirebaseApp = () => {
  if (!app) initFirebase();
  return app;
};

export default {
  initFirebase,
  getDb,
  getFirebaseAuth,
  getFirebaseApp,
  getMissingFirebaseConfig,
  isFirebaseConfigured,
};
