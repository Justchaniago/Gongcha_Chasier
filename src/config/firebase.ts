import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import * as FirebaseAuth from 'firebase/auth';
import { getAnalytics, type Analytics } from 'firebase/analytics';

const { initializeAuth, getAuth } = FirebaseAuth;
const getReactNativePersistence = (FirebaseAuth as any).getReactNativePersistence as
  | ((storage: typeof AsyncStorage) => any)
  | undefined;

// Config Project Gong Cha (Sesuai yang kamu kirim)
const firebaseConfig = {
  apiKey: 'AIzaSyCeSYZdPgERBcf0aKgd0F7wcATkfRt6_iY',
  authDomain: 'gongcha-app-4691f.firebaseapp.com',
  projectId: 'gongcha-app-4691f',
  storageBucket: 'gongcha-app-4691f.firebasestorage.app',
  messagingSenderId: '808600152798',
  appId: '1:808600152798:web:97bbdbf4beafc20d27b04f',
  measurementId: 'G-N3HRB86L4N',
};

// 1. Init App (Singleton Pattern)
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 2. Init Auth dengan Persistence (Agar tidak auto-logout)
let auth;
if (Platform.OS !== 'web') {
  try {
    auth = getReactNativePersistence
      ? initializeAuth(firebaseApp, {
          persistence: getReactNativePersistence(AsyncStorage),
        })
      : getAuth(firebaseApp);
  } catch (e) {
    auth = getAuth(firebaseApp);
  }
} else {
  auth = getAuth(firebaseApp);
}
export const firebaseAuth = auth;

// 3. Init Service Lain
export const firestoreDb = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);

// 4. Analytics
export const firebaseAnalytics: Analytics | null = Platform.OS === 'web' ? getAnalytics(firebaseApp) : null;