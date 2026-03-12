// src/config/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';

// @ts-ignore - Bypass TS Error: TypeScript gagal membaca export, tapi Metro Bundler bisa mengeksekusinya di runtime.
import { getReactNativePersistence } from "firebase/auth";

// Konfigurasi mengarah ke Project ID yang benar
const firebaseConfig = {
  apiKey: "AIzaSyCeSYZdPgERBcf0aKgd0F7wcATkfRt6_iY",
  authDomain: "gongcha-app-4691f.firebaseapp.com",
  projectId: "gongcha-app-4691f",
  storageBucket: "gongcha-app-4691f.firebasestorage.app",
  messagingSenderId: "808600152798",
  appId: "1:808600152798:web:e3077ed59649703727b04f"
};

// 1. Inisialisasi Firebase App
export const firebaseApp = initializeApp(firebaseConfig);

// 2. Inisialisasi Auth dengan AsyncStorage (Mobile friendly & persistent login)
export const firebaseAuth = initializeAuth(firebaseApp, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// 3. Inisialisasi Firestore Database
// Mengarahkan langsung ke named database "gongcha-ver001" agar tidak mencari "(default)"
export const firestoreDb = getFirestore(firebaseApp, "gongcha-ver001");