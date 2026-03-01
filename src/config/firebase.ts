import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 🔥 FIX FIREBASE v12 ERROR: Bypass TypeScript Linter
import { initializeAuth } from "firebase/auth";
// @ts-ignore: getReactNativePersistence exists in the RN bundle but missing from TS definitions
import { getReactNativePersistence } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Konfigurasi aslimu
const firebaseConfig = {
  apiKey: "AIzaSyCeSYZdPgERBcf0aKgd0F7wcATkfRt6_iY",
  authDomain: "gongcha-app-4691f.firebaseapp.com",
  projectId: "gongcha-app-4691f",
  storageBucket: "gongcha-app-4691f.firebasestorage.app",
  messagingSenderId: "808600152798",
  appId: "1:808600152798:web:323ec9a9ae5929cf27b04f",
  measurementId: "G-LVJRJZW2E6"
};

// Initialize Firebase App
export const firebaseApp = initializeApp(firebaseConfig);

// 🔥 THE MAGIC: Mengawinkan Firebase Auth dengan Storage HP
export const firebaseAuth = initializeAuth(firebaseApp, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
export const firestoreDb = getFirestore(firebaseApp);