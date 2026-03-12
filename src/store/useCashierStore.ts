// src/store/useCashierStore.ts
import {create} from "zustand";
import {onAuthStateChanged, signInWithEmailAndPassword, signOut} from "firebase/auth";
import {doc, getDoc, updateDoc} from "firebase/firestore";
import {firebaseAuth, firestoreDb} from "../config/firebase";
import {
  StaffProfile,
  TransactionRecord,
  UserTier,
  UserVoucher,
} from "../types/types"; 
import {TransactionService} from "../services/TransactionService";

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
  processTransaction: (amount: number, posId: string, useMember: boolean) => Promise<void>;
  redeemVoucher: () => Promise<void>; 
  fetchTodayStats: () => Promise<void>;
  syncData: () => Promise<void>;
}

export const useCashierStore = create<CashierState>((set, get) => ({
  staff: null,
  isAuthenticated: false,
  isLoadingAuth: true,
  totalRevenue: 0,
  totalTransactions: 0,
  memberVisits: 0,
  activeMember: null,
  scannedVoucher: null,

  fetchTodayStats: async () => {
    const {staff} = get();
    if (!staff || !staff.assignedStoreId) return;

    try {
      const dateStr = new Date().toISOString().split("T")[0];
      const statId = `${dateStr}-${staff.assignedStoreId}`;
      const statSnap = await getDoc(doc(firestoreDb, "daily_stats", statId));

      if (statSnap.exists()) {
        const data = statSnap.data();
        set({
          totalRevenue: data.totalRevenue || 0,
          totalTransactions: data.totalTransactions || 0,
          memberVisits: data.visitedMemberIds ? data.visitedMemberIds.length : 0,
        });
      } else {
        set({totalRevenue: 0, totalTransactions: 0, memberVisits: 0});
      }
    } catch (error) {
      console.error("Error fetching daily_stats:", error);
    }
  },

  login: async (email, pass) => {
    set({isLoadingAuth: true});
    try {
      const userCred = await signInWithEmailAndPassword(firebaseAuth, email, pass);
      const docSnap = await getDoc(doc(firestoreDb, "admin_users", userCred.user.uid));
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        set({
          staff: {
            uid: userCred.user.uid,
            name: data.name,
            email: data.email,
            role: data.role,
            assignedStoreId: data.assignedStoreId || "UNKNOWN",
          },
          isAuthenticated: true,
          isLoadingAuth: false,
        });
        await get().fetchTodayStats();
      }
    } catch (e) {
      set({staff: null, isAuthenticated: false, isLoadingAuth: false});
    }
  },

  logout: async () => {
    await signOut(firebaseAuth);
    set({
      staff: null,
      isAuthenticated: false,
      activeMember: null,
      scannedVoucher: null,
      totalRevenue: 0,
      totalTransactions: 0,
      memberVisits: 0,
    });
  },

  initializeAuth: () => {
    onAuthStateChanged(firebaseAuth, async (user) => {
      if (user) {
        const docSnap = await getDoc(doc(firestoreDb, "admin_users", user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          set({
            staff: {
              uid: user.uid,
              name: data.name,
              email: data.email,
              role: data.role,
              assignedStoreId: data.assignedStoreId,
            },
            isAuthenticated: true,
            isLoadingAuth: false,
          });
          await get().fetchTodayStats();
        }
      } else {
        set({staff: null, isAuthenticated: false, isLoadingAuth: false});
      }
    });
  },

  setActiveMember: (member) => set({activeMember: member}),
  setScannedVoucher: (voucher) => set({scannedVoucher: voucher}),

  processTransaction: async (amount, posId, useMember) => {
    const {staff, activeMember} = get();
    if (!staff) throw new Error("Staff not logged in");

    await TransactionService.recordTransactionClaim({
      receiptNumber: posId,
      totalAmount: amount,
      potentialPoints: useMember ? Math.floor(amount / 1000) : 0,
      userId: useMember && activeMember ? activeMember.uid : null,
      memberId: useMember && activeMember ? activeMember.uid : undefined,
      memberName: useMember && activeMember ? activeMember.name : undefined,
      staffId: staff.uid,
      storeId: staff.assignedStoreId || "UNKNOWN",
      storeName: staff.name || "Unknown Store",
    });
    
    set((state) => ({
      totalRevenue: state.totalRevenue + amount,
      totalTransactions: state.totalTransactions + 1,
      memberVisits: useMember ? state.memberVisits + 1 : state.memberVisits,
      activeMember: null,
    }));
  },

  redeemVoucher: async () => {
    const {staff, activeMember, scannedVoucher} = get();
    if (!staff || !activeMember || !scannedVoucher) return;

    const updatedVouchers = activeMember.vouchers.map((v) => 
      v.code === scannedVoucher.code ? {...v, isUsed: true} : v
    );

    await updateDoc(doc(firestoreDb, "users", activeMember.uid), {
      vouchers: updatedVouchers,
    });

    await TransactionService.recordRedeemClaim({
      receiptNumber: scannedVoucher.code,
      staffId: staff.uid,
      storeId: staff.assignedStoreId || "UNKNOWN",
      storeName: staff.name || "Unknown Store",
      userId: activeMember.uid,
      memberId: activeMember.uid,
      memberName: activeMember.name,
      voucherCode: scannedVoucher.code,
      voucherTitle: scannedVoucher.title,
    });

    set((state) => ({
      activeMember: {...activeMember, vouchers: updatedVouchers},
      scannedVoucher: null,
      totalTransactions: state.totalTransactions + 1,
    }));
  },

  syncData: async () => {
    await get().fetchTodayStats();
  },
}));