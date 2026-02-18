import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../config/firebase';
import { UserProfile } from '../types/types';

const AUTH_TIMEOUT_MS = 8000;
const PROFILE_READ_TIMEOUT_MS = 3500;
const PROFILE_WRITE_TIMEOUT_MS = 3500;

const withTimeout = async <T>(promise: Promise<T>, label: string, timeoutMs: number): Promise<T> => {
  let timeoutRef: ReturnType<typeof setTimeout> | null = null;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutRef = setTimeout(() => {
        reject(new Error(`${label} timed out. Please check your network and Firebase configuration.`));
      }, timeoutMs);
    });

    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutRef) clearTimeout(timeoutRef);
  }
};

const buildFallbackProfile = (uid: string, name: string, phone: string, role?: 'master' | 'trial'): UserProfile => ({
  id: uid,
  name: name || 'Member',
  phoneNumber: phone || '',
  currentPoints: 0,
  lifetimePoints: 0,
  tierXp: 0,
  tier: 'Silver',
  joinedDate: new Date().toISOString(),
  xpHistory: [],
  vouchers: [],
  role: role || 'trial',
});

export const AuthService = {
  // Register User Baru
  async register(email: string, pass: string, name: string, phone: string): Promise<UserProfile> {
    try {
      // 1. Create Auth User
      const userCredential = await withTimeout(
        createUserWithEmailAndPassword(firebaseAuth, email, pass),
        'Create account',
        AUTH_TIMEOUT_MS
      );
      const user = userCredential.user;

      // 2. Siapkan Data untuk Firestore
      const newProfile: UserProfile = buildFallbackProfile(user.uid, name, phone);

      // 3. Sinkronisasi profile dilakukan di background agar UI tidak terasa lambat
      void Promise.allSettled([
        withTimeout(updateProfile(user, { displayName: name }), 'Update profile', PROFILE_WRITE_TIMEOUT_MS),
        withTimeout(setDoc(doc(firestoreDb, 'users', user.uid), newProfile), 'Save profile', PROFILE_WRITE_TIMEOUT_MS),
      ]);

      return newProfile;
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  },

  // Login User Lama
  async login(email: string, pass: string): Promise<UserProfile> {
    try {
      const userCredential = await withTimeout(
        signInWithEmailAndPassword(firebaseAuth, email, pass),
        'Sign in',
        AUTH_TIMEOUT_MS
      );
      const user = userCredential.user;

      // Extract phone dari email untuk consistency
      const phoneFromEmail = email.split('@')[0] || '';
      
      // Update displayName jika belum ada (untuk user yang dibuat manual di Console)
      if (!user.displayName && phoneFromEmail) {
        await withTimeout(
          updateProfile(user, { displayName: phoneFromEmail }),
          'Update profile',
          PROFILE_WRITE_TIMEOUT_MS
        ).catch(() => {});
      }

      const docRef = doc(firestoreDb, 'users', user.uid);
      
      const docSnap = await withTimeout(getDoc(docRef), 'Load profile', PROFILE_READ_TIMEOUT_MS);

      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        // Ensure UID consistency
        if (profile.id !== user.uid) {
          profile.id = user.uid;
          await setDoc(docRef, profile, { merge: true });
        }
        return profile;
      }

      // Document tidak ada - create fallback (shouldn't happen for existing users)
      const fallbackProfile = buildFallbackProfile(
        user.uid,
        user.displayName || phoneFromEmail || 'Member',
        phoneFromEmail
      );

      await withTimeout(setDoc(docRef, fallbackProfile), 'Create profile', PROFILE_WRITE_TIMEOUT_MS);

      return fallbackProfile;
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  },

  // Logout
  async logout(): Promise<void> {
    await signOut(firebaseAuth);
  },
};