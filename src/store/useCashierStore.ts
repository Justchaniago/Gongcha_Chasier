// src/store/useCashierStore.ts
import {create} from "zustand";
import {onAuthStateChanged, signInWithEmailAndPassword, signOut} from "firebase/auth";
import {collection, doc, getDoc, getDocs, query, where} from "firebase/firestore";
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

const markVoucherAsUsed = (vouchers: UserVoucher[] = [], scannedVoucher: UserVoucher) =>
  vouchers.map((v) => (v.code === scannedVoucher.code ? {...v, isUsed: true} : v));

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
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const trxSnap = await getDocs(
        query(collection(firestoreDb, "transactions"), where("storeId", "==", staff.assignedStoreId))
      );

      let totalRevenue = 0;
      let totalTransactions = 0;
      const memberVisits = new Set<string>();

      trxSnap.docs.forEach((trxDoc) => {
        const data = trxDoc.data() as TransactionRecord;
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
        if (!createdAt || createdAt < startOfDay) return;

        totalTransactions += 1;

        const normalizedType = typeof data.type === "string" ? data.type.toUpperCase() : "";
        if (normalizedType === "EARN") {
          totalRevenue += data.totalAmount || 0;
        }

        const relatedUid = data.uid || data.userId || data.memberId;
        if (relatedUid) {
          memberVisits.add(relatedUid);
        }
      });

      set({
        totalRevenue,
        totalTransactions,
        memberVisits: memberVisits.size,
      });
    } catch (error) {
      console.error("Error fetching today's cashier stats:", error);
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
    const normalizedReceipt = posId.trim();
    if (!normalizedReceipt) {
      throw new Error("Nomor receipt wajib diisi.");
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Total transaksi harus lebih dari 0.");
    }
    if (useMember && !activeMember?.uid) {
      throw new Error("Active member is required for atomic loyalty checkout.");
    }

    await TransactionService.recordTransactionClaim({
      receiptNumber: normalizedReceipt,
      totalAmount: amount,
      potentialPoints: useMember ? Math.floor(amount / 1000) : 0,
      uid: useMember && activeMember ? activeMember.uid : null,
      memberId: useMember && activeMember ? activeMember.uid : undefined,
      memberName: useMember && activeMember ? activeMember.name : undefined,
      staffId: staff.uid,
      cashierName: staff.name,
      storeId: staff.assignedStoreId || "UNKNOWN",
      storeName: staff.assignedStoreId || "UNKNOWN",
    });
    
    set((state) => ({
      totalRevenue: state.totalRevenue + amount,
      totalTransactions: state.totalTransactions + 1,
      memberVisits: useMember && activeMember?.uid ? state.memberVisits + 1 : state.memberVisits,
      activeMember: null,
    }));
  },

  redeemVoucher: async () => {
    const {staff, activeMember, scannedVoucher} = get();
    if (!staff || !activeMember || !scannedVoucher) {
      throw new Error("Data redeem belum lengkap.");
    }

    const updatedVouchers = markVoucherAsUsed(activeMember.vouchers, scannedVoucher);

    try {
      await TransactionService.recordRedeemClaim({
        receiptNumber: scannedVoucher.code,
        staffId: staff.uid,
        cashierName: staff.name,
        storeId: staff.assignedStoreId || "UNKNOWN",
        storeName: staff.assignedStoreId || "UNKNOWN",
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
    } catch (error: any) {
      console.info("Redeem voucher blocked:", error?.message || error);
      throw new Error(error?.message || "Redeem voucher gagal disimpan ke Firebase.");
    }
  },

  syncData: async () => {
    await get().fetchTodayStats();
  },
}));
