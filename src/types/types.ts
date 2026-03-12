export type MemberTier = 'Silver' | 'Gold' | 'Platinum';
export type HistoryEventType = 'earn' | 'redeem';

// 🔥 REFACTOR: Sesuaikan dengan admin_users
export interface StaffProfile {
  id: string; 
  name: string;
  email: string;
  role: 'cashier' | 'store_manager' | 'STAFF' | 'SUPER_ADMIN';
  assignedStoreId: string | null; // Menggantikan storeLocations array
}

export interface XpRecord {
  id: string;
  date: string;
  amount: number;
  type?: HistoryEventType;
  context?: string;
  location?: string;
  tierEligible?: boolean;
  transactionId?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string; 
  photoURL?: string; 
  currentPoints: number;
  lifetimePoints: number;
  tierXp: number;
  xpHistory: XpRecord[];
  tier: MemberTier;
  joinedDate: string;
  vouchers: UserVoucher[];
  role?: 'master' | 'trial' | 'admin' | 'member'; 
}

// 🔥 REFACTOR: Standarisasi properti transaksi
export interface TransactionRecord {
  id?: string;
  transactionId: string;
  amount: number;
  potentialPoints: number;
  memberId: string | null;
  memberName: string | null;
  staffId: string;
  storeLocation: string;
  status: 'pending' | 'verified' | 'rejected';
  type: 'earn' | 'redeem';
  createdAt: any;
}

// 🔥 REFACTOR: Standarisasi dengan skema rewards_catalog
export interface RewardItem {
  id: string;
  title: string;
  description: string;
  pointsrequired: number; // Huruf kecil semua sesuai The God Schema
  imageUrl: string;       // U besar sesuai The God Schema
  isActive: boolean;
}

export interface UserVoucher {
  id: string;
  rewardId: string;
  title: string;
  code: string;
  redeemedAt: string;
  expiresAt: string;
  isUsed: boolean;
}