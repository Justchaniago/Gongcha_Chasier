// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCeSYZdPgERBcf0aKgd0F7wcATkfRt6_iY",
  authDomain: "gongcha-app-4691f.firebaseapp.com",
  projectId: "gongcha-app-4691f",
  storageBucket: "gongcha-app-4691f.firebasestorage.app",
  messagingSenderId: "808600152798",
  appId: "1:808600152798:web:323ec9a9ae5929cf27b04f",
  measurementId: "G-LVJRJZW2E6"
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);
export const analytics = getAnalytics(firebaseApp);

// Tambahkan Auth dan Firestore
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
export const firebaseAuth = getAuth(firebaseApp);
export const firestoreDb = getFirestore(firebaseApp);