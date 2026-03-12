// src/store/useCashierStore.ts
import { create } from 'zustand';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../config/firebase';
import { StaffProfile, TransactionRecord, UserTier } from '../types/types'; 

export interface UserVoucher {
  id: string;
  rewardId?: string;
  title: string;
  code: string;
  isUsed?: boolean;
  expiresAt?: string;
  type?: "catalog" | "personal";
}

export interface MemberData {
  uid: string;
  name: string;
  phone?: string;
  points?: number;
  tier: UserTier;
  walletBalance?: number; 
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
  fetchTodayStats: () => Promise<void>;
  syncData: () => Promise<void>;
}

export const useCashierStore = create<CashierState>((set, get) => ({
  staff: null, isAuthenticated: false, isLoadingAuth: true,
  totalRevenue: 0, totalTransactions: 0, memberVisits: 0,
  activeMember: null, scannedVoucher: null, 

  fetchTodayStats: async () => {
    const { staff } = get();
    if (!staff || staff.assignedStoreId === 'UNKNOWN') return;

    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const statId = `${dateStr}-${staff.assignedStoreId}`;

      const statRef = doc(firestoreDb, 'daily_stats', statId);
      const statSnap = await getDoc(statRef);

      if (statSnap.exists()) {
        const data = statSnap.data();
        set({
          totalRevenue: data.totalRevenue || 0,
          totalTransactions: data.totalTransactions || 0,
          memberVisits: data.visitedMemberIds ? data.visitedMemberIds.length : 0,
        });
      } else {
        set({ totalRevenue: 0, totalTransactions: 0, memberVisits: 0 });
      }
    } catch (error) {
      console.error("[FIRESTORE] Error fetching daily_stats:", error);
    }
  },

  login: async (email, pass) => {
    set({ isLoadingAuth: true });
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, pass);
      const user = userCredential.user;
      
      const docRef = doc(firestoreDb, 'admin_users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const storeId = data.assignedStoreId || (data.storeLocations ? data.storeLocations[0] : 'UNKNOWN');
        set({
          staff: { uid: user.uid, name: data.name, email: data.email, role: data.role, assignedStoreId: storeId },
          isAuthenticated: true, isLoadingAuth: false
        });
      } else {
        set({
          staff: { uid: user.uid, name: user.email?.split('@')[0] || 'Staff', email: user.email || '', role: 'STAFF', assignedStoreId: 'UNKNOWN' },
          isAuthenticated: true, isLoadingAuth: false
        });
      }
      
      // Load stat hari ini setelah berhasil login
      await get().fetchTodayStats();
      
    } catch (e) {
      console.error('[LOGIN] Error during login or fetch staff:', e);
      set({ staff: null, isAuthenticated: false, isLoadingAuth: false });
    }
  },

  logout: async () => {
    await signOut(firebaseAuth);
    set({ staff: null, isAuthenticated: false, activeMember: null, scannedVoucher: null, totalRevenue: 0, totalTransactions: 0, memberVisits: 0 });
  },

  initializeAuth: () => {
    onAuthStateChanged(firebaseAuth, async (currentUser) => {
      if (currentUser) {
        try {
          const docRef = doc(firestoreDb, 'admin_users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const storeId = data.assignedStoreId || (data.storeLocations ? data.storeLocations[0] : 'UNKNOWN');
            set({ staff: { uid: currentUser.uid, name: data.name, email: data.email, role: data.role, assignedStoreId: storeId }, isAuthenticated: true, isLoadingAuth: false });
          } else {
            set({ staff: { uid: currentUser.uid, name: currentUser.email?.split('@')[0] || 'Staff', email: currentUser.email || '', role: 'STAFF', assignedStoreId: 'UNKNOWN' }, isAuthenticated: true, isLoadingAuth: false });
          }
          // Load stat hari ini
          await get().fetchTodayStats();
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
    const storeName = staff.name || 'Unknown Store';

    try {
      const transactionData: Omit<TransactionRecord, 'id'> = {
        receiptNumber: posTransactionId, 
        storeId: storeId,
        storeName: storeName,          
        userId: useMember && activeMember ? activeMember.uid : null, 
        memberId: useMember && activeMember ? activeMember.uid : undefined, 
        memberName: useMember && activeMember ? activeMember.name : undefined,
        staffId: staff.uid, 
        totalAmount: amount,                  
        type: 'earn',                    
        status: 'COMPLETED',             
        potentialPoints: useMember ? Math.floor(amount / 1000) : 0, 
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(firestoreDb, 'transactions'), transactionData);
      
      // Update UI stat secara lokal agar cepat (akan tersinkronisasi murni dari backend saat refresh/login)
      set((state) => ({ 
        totalRevenue: state.totalRevenue + amount, 
        totalTransactions: state.totalTransactions + 1, 
        // Logic sementara di klien: anggap +1 visit jika pakai member. Backend yang akan atur array uniknya.
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

      const transactionData: Omit<TransactionRecord, 'id'> = {
        receiptNumber: 'REDEEM-' + scannedVoucher.code, 
        storeId: storeId, 
        storeName: staff.name || 'Unknown Store',
        userId: activeMember.uid,
        memberId: activeMember.uid, 
        memberName: activeMember.name, 
        staffId: staff.uid, 
        totalAmount: 0, 
        type: 'redeem',     
        status: 'COMPLETED', 
        voucherCode: scannedVoucher.code, 
        voucherTitle: scannedVoucher.title, 
        createdAt: serverTimestamp(),
      };
      
      await addDoc(collection(firestoreDb, 'transactions'), transactionData);

      set((state) => ({ 
        activeMember: { ...activeMember, vouchers: updatedVouchers }, 
        scannedVoucher: null,
        totalTransactions: state.totalTransactions + 1
      }));
    } catch (error) {
      console.error("Gagal redeem voucher:", error);
      throw error;
    }
  },

  syncData: async () => { 
    await get().fetchTodayStats(); 
  }
}));