// src/store/useCashierStore.ts
import { create } from 'zustand';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../config/firebase';
import { StaffProfile } from '../types/types'; 

export interface UserVoucher {
  id: string;
  rewardId: string;
  title: string;
  code: string;
  isUsed: boolean;
  expiresAt: string;
  type: "catalog" | "personal";
}

export interface MemberData {
  uid: string;
  name: string;
  phone: string;
  points: number;
  tier: 'Silver' | 'Gold' | 'Platinum';
  walletBalance: number; 
  vouchers: UserVoucher[]; 
}

interface CashierState {
  staff: StaffProfile | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  totalRevenue: number;
  totalTransactions: number;
  memberVisits: number;
  activeMember: MemberData | null;
  scannedVoucher: UserVoucher | null; 

  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => void;
  setActiveMember: (member: MemberData | null) => void;
  setScannedVoucher: (voucher: UserVoucher | null) => void; 
  processTransaction: (amount: number, posTransactionId: string, useMember: boolean) => Promise<void>;
  redeemVoucher: () => Promise<void>; 
  syncData: () => Promise<void>;
}

export const useCashierStore = create<CashierState>((set, get) => ({
  staff: null, isAuthenticated: false, isLoadingAuth: true,
  totalRevenue: 0, totalTransactions: 0, memberVisits: 0,
  activeMember: null, 
  scannedVoucher: null, 

  login: async (email, pass) => {
    set({ isLoadingAuth: true });
    try {
      console.log('[LOGIN] Attempting login for:', email);
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, pass);
      const user = userCredential.user;
      console.log('[LOGIN] Login success, UID:', user.uid);
      // Fetch staff profile dari Firestore
      const docRef = doc(firestoreDb, 'admin_users', user.uid);
      console.log('[LOGIN] Fetching staff profile from Firestore...');
      const fetchStart = Date.now();
      const docSnap = await getDoc(docRef);
      const fetchEnd = Date.now();
      console.log(`[LOGIN] Firestore fetch done in ${fetchEnd - fetchStart} ms`);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const storeId = data.assignedStoreId || (data.storeLocations ? data.storeLocations[0] : 'UNKNOWN');
        console.log('[LOGIN] Staff profile found:', data);
        set({
          staff: {
            id: user.uid,
            name: data.name,
            email: data.email,
            role: data.role,
            assignedStoreId: storeId
          },
          isAuthenticated: true,
          isLoadingAuth: false
        });
      } else {
        console.warn('[LOGIN] Staff profile NOT found in admin_users, fallback to default.');
        set({
          staff: {
            id: user.uid,
            name: user.email?.split('@')[0] || 'Staff',
            email: user.email || '',
            role: 'cashier',
            assignedStoreId: 'UNKNOWN'
          },
          isAuthenticated: true,
          isLoadingAuth: false
        });
      }
    } catch (e) {
      console.error('[LOGIN] Error during login or fetch staff:', e);
      set({ staff: null, isAuthenticated: false, isLoadingAuth: false });
    }
  },

  logout: async () => {
    await signOut(firebaseAuth);
    set({ staff: null, isAuthenticated: false, activeMember: null, scannedVoucher: null });
  },

  initializeAuth: () => {
    onAuthStateChanged(firebaseAuth, async (currentUser) => {
      if (currentUser) {
        try {
          // 🔥 REFACTOR: Ubah 'staff' ke 'admin_users'
          const docRef = doc(firestoreDb, 'admin_users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Fallback backward compatibility jika menggunakan storeLocations lama
            const storeId = data.assignedStoreId || (data.storeLocations ? data.storeLocations[0] : 'UNKNOWN');
            
            set({ 
              staff: { 
                id: currentUser.uid, 
                name: data.name, 
                email: data.email, 
                role: data.role, 
                assignedStoreId: storeId 
              }, 
              isAuthenticated: true, 
              isLoadingAuth: false 
            });
          } else {
            set({ staff: { id: currentUser.uid, name: currentUser.email?.split('@')[0] || 'Staff', email: currentUser.email || '', role: 'cashier', assignedStoreId: 'UNKNOWN' }, isAuthenticated: true, isLoadingAuth: false });
          }
        } catch (e) { set({ staff: null, isAuthenticated: false, isLoadingAuth: false }); }
      } else {
        set({ staff: null, isAuthenticated: false, isLoadingAuth: false });
      }
    });
  },

  setActiveMember: (member) => set({ activeMember: member }),
  setScannedVoucher: (voucher) => set({ scannedVoucher: voucher }), 

  processTransaction: async (amount, posTransactionId, useMember) => {
    const { staff, activeMember } = get();
    if (!staff) throw new Error("Kasir belum login");

    const storeId = staff.assignedStoreId || 'UNKNOWN';

    try {
      // 🔥 REFACTOR: Format data persis dengan The God Schema di Admin
      const transactionData = {
        storeId: storeId,
        storeLocation: storeId,          // Dibutuhkan di Admin Panel
        transactionId: posTransactionId, // Alias
        posTransactionId: posTransactionId, 
        staffId: staff.id, 
        cashierName: staff.name,         
        amount: amount,                  // Dibutuhkan di Admin Panel
        totalAmount: amount,             
        type: 'earn',                    // HARUS HURUF KECIL
        status: 'pending',               // HARUS HURUF KECIL
        memberId: useMember && activeMember ? activeMember.uid : null, 
        memberName: useMember && activeMember ? activeMember.name : null,
        potentialPoints: useMember ? Math.floor(amount / 1000) : 0, 
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(firestoreDb, 'transactions'), transactionData);
      
      set((state) => ({ 
        totalRevenue: state.totalRevenue + amount, 
        totalTransactions: state.totalTransactions + 1, 
        memberVisits: useMember ? state.memberVisits + 1 : state.memberVisits, 
        activeMember: null 
      }));
    } catch (error) { throw error; }
  },

  redeemVoucher: async () => {
    const { staff, activeMember, scannedVoucher } = get();
    if (!staff || !activeMember || !scannedVoucher) throw new Error("Data tidak lengkap untuk redeem");

    const storeId = staff.assignedStoreId || 'UNKNOWN';

    try {
      const updatedVouchers = activeMember.vouchers.map((v) => {
        if (v.code === scannedVoucher.code) {
          return { ...v, isUsed: true, usedAtStore: storeId, usedAtDate: new Date().toISOString() };
        }
        return v;
      });

      const userRef = doc(firestoreDb, 'users', activeMember.uid);
      await updateDoc(userRef, { vouchers: updatedVouchers });

      // 🔥 REFACTOR: Transaksi redeem distandarisasi huruf kecil
      const transactionData = {
        storeId: storeId, 
        storeLocation: storeId,
        staffId: staff.id, 
        cashierName: staff.name, 
        transactionId: 'REDEEM-' + scannedVoucher.code,
        posTransactionId: 'REDEEM-' + scannedVoucher.code, 
        amount: 0, 
        totalAmount: 0, 
        type: 'redeem',     // LOWERCASE
        status: 'verified', // REDEEM OTOMATIS VERIFIED
        memberId: activeMember.uid, 
        memberName: activeMember.name, 
        voucherCode: scannedVoucher.code, 
        voucherTitle: scannedVoucher.title, 
        createdAt: serverTimestamp(),
      };
      
      await addDoc(collection(firestoreDb, 'transactions'), transactionData);

      set({ activeMember: { ...activeMember, vouchers: updatedVouchers }, scannedVoucher: null });
    } catch (error) {
      console.error("Gagal redeem voucher:", error);
      throw error;
    }
  },

  syncData: async () => { return new Promise((resolve) => setTimeout(resolve, 1500)); }
}));