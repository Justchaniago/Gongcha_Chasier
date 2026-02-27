// src/store/useCashierStore.ts
import { create } from 'zustand';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../config/firebase';

// Import tipe data aslimu
import { StaffProfile } from '../types/types'; 

// Tipe data Dummy untuk The Apple Wallet Member Page kita
export interface MemberData {
  uid: string;
  name: string;
  phone: string;
  points: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  walletBalance: number;
}

interface CashierState {
  // --- 1. STATE AUTHENTICATION (Saraf Asli milikmu) ---
  staff: StaffProfile | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;

  // --- 2. STATE UI DASHBOARD (Otak Kasir) ---
  totalRevenue: number;
  totalTransactions: number;
  memberVisits: number;
  activeMember: MemberData | null;

  // --- ACTIONS ---
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => void;
  
  setActiveMember: (member: MemberData | null) => void;
  processTransaction: (amount: number, useMember: boolean) => void;
  syncData: () => Promise<void>;
}

export const useCashierStore = create<CashierState>((set) => ({
  // Default Auth
  staff: null,
  isAuthenticated: false,
  isLoadingAuth: true,

  // Default Dashboard
  totalRevenue: 0, 
  totalTransactions: 0,
  memberVisits: 0,
  activeMember: null,

  // --- LOGIKA LOGIN ASLI ---
  login: async (email, pass) => {
    await signInWithEmailAndPassword(firebaseAuth, email, pass);
  },

  // --- LOGIKA LOGOUT ASLI ---
  logout: async () => {
    await signOut(firebaseAuth);
    set({ 
      staff: null, 
      isAuthenticated: false,
      activeMember: null // Bersihkan layar jika logout
    });
  },

  // --- LISTENER FIREBASE ASLI (Pengganti useEffect di Context) ---
  initializeAuth: () => {
    // onAuthStateChanged otomatis memantau setiap kali app dibuka atau ada login/logout
    onAuthStateChanged(firebaseAuth, async (currentUser) => {
      if (currentUser) {
        try {
          const docRef = doc(firestoreDb, 'staff', currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            set({
              staff: {
                id: currentUser.uid, 
                name: data.name,
                email: data.email,
                role: data.role,
                storeLocations: Array.isArray(data.storeLocations) ? data.storeLocations : [data.storeLocations || 'Unknown Location']
              },
              isAuthenticated: true,
              isLoadingAuth: false
            });
          } else {
            // Fallback aslimu
            set({
              staff: {
                id: currentUser.uid,
                name: currentUser.email?.split('@')[0] || 'Staff',
                email: currentUser.email || '',
                role: 'cashier', // Default
                storeLocations: ['Unknown Location']
              },
              isAuthenticated: true,
              isLoadingAuth: false
            });
          }
        } catch (e) {
          console.error("Error fetching staff profile", e);
          set({ staff: null, isAuthenticated: false, isLoadingAuth: false });
        }
      } else {
        // Tidak ada user
        set({ staff: null, isAuthenticated: false, isLoadingAuth: false });
      }
    });
  },

  // --- LOGIKA DASHBOARD UI ---
  setActiveMember: (member) => set({ activeMember: member }),
  
  processTransaction: (amount, useMember) => set((state) => ({
    totalRevenue: state.totalRevenue + amount,
    totalTransactions: state.totalTransactions + 1,
    memberVisits: useMember ? state.memberVisits + 1 : state.memberVisits,
  })),
  
  syncData: async () => {
    return new Promise((resolve) => setTimeout(resolve, 1500));
  }
}));