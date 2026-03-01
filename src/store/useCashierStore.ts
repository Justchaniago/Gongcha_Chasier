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
  vouchers: UserVoucher[]; // 🔥 Properti yang tadi dicari TypeScript
}

interface CashierState {
  staff: StaffProfile | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;

  totalRevenue: number;
  totalTransactions: number;
  memberVisits: number;
  
  activeMember: MemberData | null;
  scannedVoucher: UserVoucher | null; // 🔥 State Voucher Baru

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

  login: async (email, pass) => { await signInWithEmailAndPassword(firebaseAuth, email, pass); },

  logout: async () => {
    await signOut(firebaseAuth);
    set({ staff: null, isAuthenticated: false, activeMember: null, scannedVoucher: null });
  },

  initializeAuth: () => {
    onAuthStateChanged(firebaseAuth, async (currentUser) => {
      if (currentUser) {
        try {
          const docRef = doc(firestoreDb, 'staff', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            set({ staff: { id: currentUser.uid, name: data.name, email: data.email, role: data.role, storeLocations: data.storeLocations }, isAuthenticated: true, isLoadingAuth: false });
          } else {
            set({ staff: { id: currentUser.uid, name: currentUser.email?.split('@')[0] || 'Staff', email: currentUser.email || '', role: 'cashier', storeLocations: ['Unknown Location'] }, isAuthenticated: true, isLoadingAuth: false });
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

    try {
      const transactionData = {
        storeId: Array.isArray(staff.storeLocations) ? staff.storeLocations[0] : (staff.storeLocations || 'UNKNOWN'),
        cashierId: staff.id, cashierName: staff.name, posTransactionId: posTransactionId, totalAmount: amount,
        type: 'EARN', status: 'PENDING', 
        memberId: useMember && activeMember ? activeMember.uid : null, memberName: useMember && activeMember ? activeMember.name : null,
        pointsEarned: useMember ? Math.floor(amount / 1000) : 0, createdAt: serverTimestamp(),
      };
      await addDoc(collection(firestoreDb, 'transactions'), transactionData);
      set((state) => ({ totalRevenue: state.totalRevenue + amount, totalTransactions: state.totalTransactions + 1, memberVisits: useMember ? state.memberVisits + 1 : state.memberVisits, activeMember: null }));
    } catch (error) { throw error; }
  },

  redeemVoucher: async () => {
    const { staff, activeMember, scannedVoucher } = get();
    if (!staff || !activeMember || !scannedVoucher) throw new Error("Data tidak lengkap untuk redeem");

    const storeId = Array.isArray(staff.storeLocations) ? staff.storeLocations[0] : (staff.storeLocations || 'UNKNOWN');

    try {
      const updatedVouchers = activeMember.vouchers.map((v) => {
        if (v.code === scannedVoucher.code) {
          return { ...v, isUsed: true, usedAtStore: storeId, usedAtDate: new Date().toISOString() };
        }
        return v;
      });

      const userRef = doc(firestoreDb, 'users', activeMember.uid);
      await updateDoc(userRef, { vouchers: updatedVouchers });

      const transactionData = {
        storeId: storeId, cashierId: staff.id, cashierName: staff.name, posTransactionId: 'REDEEM-' + scannedVoucher.code, 
        totalAmount: 0, type: 'REDEEM', status: 'COMPLETED', 
        memberId: activeMember.uid, memberName: activeMember.name, voucherCode: scannedVoucher.code, voucherTitle: scannedVoucher.title, 
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