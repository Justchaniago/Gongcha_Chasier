import { create } from 'zustand';

export interface MemberData {
  uid: string;
  name: string;
  phone: string;
  points: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  walletBalance: number;
}

interface CashierState {
  // --- STATE (DATA) ---
  storeId: string;
  storeName: string;
  cashierName: string;
  
  totalRevenue: number;
  totalTransactions: number;
  memberVisits: number;
  
  activeMember: MemberData | null;

  // --- ACTIONS (FUNGSI) ---
  // Fungsi baru untuk set data dari Firebase setelah login
  setCashierProfile: (name: string, storeId: string, storeName: string) => void;
  
  setActiveMember: (member: MemberData | null) => void;
  processTransaction: (amount: number, useMember: boolean) => void;
  syncData: () => Promise<void>;
}

export const useCashierStore = create<CashierState>((set) => ({
  // Default loading state (bisa dikosongkan)
  storeId: '',
  storeName: 'Loading Store...', 
  cashierName: '',
  
  totalRevenue: 0, 
  totalTransactions: 0,
  memberVisits: 0,
  
  activeMember: null,

  // SET PROFILE DARI FIREBASE
  setCashierProfile: (name, storeId, storeName) => set({ 
    cashierName: name, 
    storeId: storeId, 
    storeName: storeName 
  }),

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