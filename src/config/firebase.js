import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    'AIzaSyD9LtxVBeYXwdNkl3vKsRHEopRIPy3adYU',
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    process.env.FIREBASE_AUTH_DOMAIN ||
    'uberclone-e60b2.firebaseapp.com',
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    'uberclone-e60b2',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    'uberclone-e60b2.firebasestorage.app',
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    process.env.FIREBASE_MESSAGING_SENDER_ID ||
    '936203623174',
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    process.env.FIREBASE_APP_ID ||
    '1:936203623174:web:002fa9538165a0ae339c87',
  measurementId:
    process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ||
    'G-T21K9VQX2Y',
};

let app;
let db;
let auth;

export const initFirebase = () => {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
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
      auth = getAuth(app);
    }
  }

  return { app, db, auth };
};

// Initialize default instance
initFirebase();

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
};
